import { describe, it, expect } from "vitest";
import { buzzwordBingo } from "../../src/signals/buzzword-bingo.js";
import { makeContext, makeTextFact } from "./__helpers__/make-context.js";

describe("Buzzword Bingo", () => {
  describe("high scores (sloppy content)", () => {
    it("scores high when page is saturated with tier A buzzwords", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "Our synergy-driven platform will revolutionize your game-changing workflow. " +
              "This next-generation paradigm shift is disruptive and best-in-class. " +
              "A world-class turn-key bleeding-edge solution that leverages innovation.",
            "paragraph",
            "page.tsx",
            1,
          ),
          makeTextFact(
            "Empower your team to streamline operations with cutting-edge solutions. " +
              "Optimize and transform your business. Elevate and unlock supercharge potential.",
            "paragraph",
            "page.tsx",
            10,
          ),
        ],
      });

      const result = buzzwordBingo.analyze(ctx);
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it("scores high with phrase patterns present", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "In today's fast-paced world, you need a synergy-driven revolutionary solution. " +
              "Take your business to the next level with our game-changing platform. " +
              "Whether you're a startup or a large enterprise, we have disruptive solutions. " +
              "Designed with you in mind, our next-generation tools will supercharge your workflow. " +
              "It's time to leverage cutting-edge innovative seamless robust scalable technology.",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      const result = buzzwordBingo.analyze(ctx);
      expect(result.score).toBeGreaterThan(0.5);
    });
  });

  describe("low scores (clean content)", () => {
    it("scores 0 for normal text with no buzzwords", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "Our application helps teams manage their projects. " +
              "Track tasks, set deadlines, and collaborate with your team. " +
              "Simple pricing, no surprises.",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      const result = buzzwordBingo.analyze(ctx);
      expect(result.score).toBe(0);
    });

    it("scores 0 when only 1-2 buzzwords appear (variety too low)", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "Our innovative platform helps you manage tasks effectively. " +
              "We built a simple tool that works.",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      const result = buzzwordBingo.analyze(ctx);
      expect(result.score).toBe(0);
    });

    it("scores 0 when density is low even with some variety", () => {
      // Lots of normal text with a few buzzwords scattered in
      const normalText = "The quick brown fox jumps over the lazy dog. ".repeat(
        50,
      );
      const ctx = makeContext({
        texts: [
          makeTextFact(
            normalText + " innovative seamless robust scalable dynamic",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      const result = buzzwordBingo.analyze(ctx);
      // Variety might be > 3 but density should be very low
      expect(result.score).toBe(0);
    });
  });

  describe("threshold behavior", () => {
    it("requires both density > 1 AND variety > 2 to flag", () => {
      // High density but low variety (same word repeated)
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "synergy synergy synergy synergy synergy synergy synergy synergy",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      const result = buzzwordBingo.analyze(ctx);
      // High density but variety = 1, so should not flag
      expect(result.score).toBe(0);
    });
  });

  describe("multi-page analysis", () => {
    it("takes the worst page score", () => {
      const ctx = makeContext({
        texts: [
          // Page 1: clean
          makeTextFact(
            "Our simple tool helps you track tasks and deadlines.",
            "paragraph",
            "clean-page.tsx",
            1,
          ),
          // Page 2: sloppy
          makeTextFact(
            "Our synergy-driven next-generation paradigm shift will revolutionize your game-changing " +
              "disruptive best-in-class world-class bleeding-edge workflow. " +
              "Leverage and empower your team to streamline cutting-edge solutions. " +
              "Optimize transform elevate unlock supercharge your innovative seamless robust business.",
            "paragraph",
            "sloppy-page.tsx",
            1,
          ),
        ],
      });

      const result = buzzwordBingo.analyze(ctx);
      expect(result.score).toBeGreaterThan(0);
      // Evidence should reference the sloppy page
      const sloppyEvidence = result.evidence.find((e) =>
        e.files.includes("sloppy-page.tsx"),
      );
      expect(sloppyEvidence).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("returns insufficient_data with empty text facts", () => {
      const ctx = makeContext({});
      const result = buzzwordBingo.analyze(ctx);
      expect(result.score).toBe(0);
      expect(result.status).toBe("insufficient_data");
      expect(result.confidence).toBe("low");
    });

    it("handles text with special characters", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "It's time to take your game-changing paradigm shift to the next level! " +
              "Our best-in-class synergy-driven solution will revolutionize your world-class workflow. " +
              "Leverage cutting-edge innovative seamless robust technology.",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      const result = buzzwordBingo.analyze(ctx);
      expect(result.score).toBeGreaterThan(0);
    });

    it("matches hyphenated buzzwords correctly", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "Our game-changing next-generation best-in-class world-class bleeding-edge " +
              "turn-key cutting-edge solution brings synergy and will revolutionize everything. " +
              "Leverage empower streamline optimize transform elevate unlock supercharge " +
              "innovative seamless robust scalable dynamic.",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      const result = buzzwordBingo.analyze(ctx);
      expect(result.score).toBeGreaterThan(0);
      expect(result.evidence.length).toBeGreaterThan(0);
    });
  });

  describe("signal definition", () => {
    it("has correct id and category", () => {
      expect(buzzwordBingo.id).toBe("buzzword-bingo");
      expect(buzzwordBingo.category).toBe("content");
    });

    it("is not attenuatable", () => {
      expect(buzzwordBingo.attenuatable).toBe(false);
    });

    it("needs css, tailwind, and inline extractors", () => {
      expect(buzzwordBingo.needs).toEqual(["css", "tailwind", "inline"]);
    });
  });
});
