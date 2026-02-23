import { describe, it, expect } from "vitest";
import { cardCarnival } from "../../src/signals/card-carnival.js";
import {
  makeContext,
  makeTextFact,
  makeStructuralFact,
} from "./__helpers__/make-context.js";

describe("Card Carnival", () => {
  describe("heading+paragraph pair detection", () => {
    it("detects 3+ heading+paragraph pairs as a card cluster", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Feature One", "heading", "page.tsx", 10),
          makeTextFact(
            "Description of feature one goes here in detail.",
            "paragraph",
            "page.tsx",
            12,
          ),
          makeTextFact("Feature Two", "heading", "page.tsx", 20),
          makeTextFact(
            "Description of feature two goes here in detail.",
            "paragraph",
            "page.tsx",
            22,
          ),
          makeTextFact("Feature Three", "heading", "page.tsx", 30),
          makeTextFact(
            "Description of feature three goes here in detail.",
            "paragraph",
            "page.tsx",
            32,
          ),
        ],
      });

      const result = cardCarnival.analyze(ctx);
      expect(result.score).toBeGreaterThanOrEqual(0.3);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it("scores higher for 6 cards", () => {
      const texts = [];
      for (let i = 0; i < 6; i++) {
        const base = 10 + i * 10;
        texts.push(
          makeTextFact(`Feature ${i + 1}`, "heading", "page.tsx", base),
        );
        texts.push(
          makeTextFact(
            `This is a longer description of feature ${i + 1} that explains what it does.`,
            "paragraph",
            "page.tsx",
            base + 2,
          ),
        );
      }
      const ctx = makeContext({ texts });

      const result = cardCarnival.analyze(ctx);
      expect(result.score).toBeGreaterThanOrEqual(0.7);
    });

    it("handles heading+paragraph gap up to 15 lines (icon elements between)", () => {
      // Simulates cards with icons/buttons between heading and paragraph
      const ctx = makeContext({
        texts: [
          makeTextFact("AI-Powered", "heading", "page.tsx", 100),
          makeTextFact(
            "Leverage cutting-edge AI to supercharge your workflow and boost productivity.",
            "paragraph",
            "page.tsx",
            114,
          ),
          makeTextFact("Smart Ranking", "heading", "page.tsx", 120),
          makeTextFact(
            "Intelligent ranking algorithms that learn from your usage patterns over time.",
            "paragraph",
            "page.tsx",
            134,
          ),
          makeTextFact("Real-Time Sync", "heading", "page.tsx", 140),
          makeTextFact(
            "Seamless synchronization across all your devices in real time without delay.",
            "paragraph",
            "page.tsx",
            154,
          ),
        ],
      });

      const result = cardCarnival.analyze(ctx);
      expect(result.score).toBeGreaterThanOrEqual(0.3);
    });

    it("does not pair heading and paragraph more than 15 lines apart", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Feature One", "heading", "page.tsx", 10),
          makeTextFact(
            "Description of feature one that is long enough to count.",
            "paragraph",
            "page.tsx",
            26,
          ),
          makeTextFact("Feature Two", "heading", "page.tsx", 40),
          makeTextFact(
            "Description of feature two that is long enough to count.",
            "paragraph",
            "page.tsx",
            56,
          ),
          makeTextFact("Feature Three", "heading", "page.tsx", 70),
          makeTextFact(
            "Description of feature three that is long enough to count.",
            "paragraph",
            "page.tsx",
            86,
          ),
        ],
      });

      const result = cardCarnival.analyze(ctx);
      // Gap is 16 lines, exceeds PAIR_LINE_GAP=15, so no pairs found via heading detection
      expect(result.score).toBe(0);
    });
  });

  describe("pseudo-card detection (untagged headings)", () => {
    it("detects card patterns when titles are tagged as 'other' instead of 'heading'", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("AI-Powered", "other", "page.tsx", 100),
          makeTextFact(
            "Leverage cutting-edge AI to supercharge your workflow and boost productivity.",
            "other",
            "page.tsx",
            103,
          ),
          makeTextFact("Smart Ranking", "other", "page.tsx", 110),
          makeTextFact(
            "Intelligent ranking algorithms that learn from your usage patterns over time.",
            "other",
            "page.tsx",
            113,
          ),
          makeTextFact("Real-Time Sync", "other", "page.tsx", 120),
          makeTextFact(
            "Seamless synchronization across all your devices in real time without delay.",
            "other",
            "page.tsx",
            123,
          ),
        ],
      });

      const result = cardCarnival.analyze(ctx);
      expect(result.score).toBeGreaterThanOrEqual(0.3);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it("detects 6 pseudo-cards and scores high", () => {
      const texts = [];
      for (let i = 0; i < 6; i++) {
        const base = 10 + i * 12;
        texts.push(makeTextFact(`Feature ${i + 1}`, "other", "page.tsx", base));
        texts.push(
          makeTextFact(
            `This is a detailed description of feature ${i + 1} that explains all about it.`,
            "other",
            "page.tsx",
            base + 3,
          ),
        );
      }
      const ctx = makeContext({ texts });

      const result = cardCarnival.analyze(ctx);
      expect(result.score).toBeGreaterThanOrEqual(0.7);
    });

    it("does not trigger pseudo-card when title has more than 8 words", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "This is a really long title that has way too many words",
            "other",
            "page.tsx",
            10,
          ),
          makeTextFact(
            "And this is a description that goes along with it for context.",
            "other",
            "page.tsx",
            13,
          ),
          makeTextFact(
            "Another very long title text that should not be treated as card",
            "other",
            "page.tsx",
            20,
          ),
          makeTextFact(
            "And another description that pairs with the long title above text.",
            "other",
            "page.tsx",
            23,
          ),
          makeTextFact(
            "Yet another long title text that exceeds the eight word card limit",
            "other",
            "page.tsx",
            30,
          ),
          makeTextFact(
            "Third description text that is long enough to be a description pair.",
            "other",
            "page.tsx",
            33,
          ),
        ],
      });

      const result = cardCarnival.analyze(ctx);
      // Titles > 8 words should not be detected as pseudo-card titles
      expect(result.score).toBe(0);
    });

    it("ignores button and link context in pseudo-card detection", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Click Me", "button", "page.tsx", 10),
          makeTextFact(
            "This is a long paragraph description that should be ignored as a pair.",
            "other",
            "page.tsx",
            13,
          ),
          makeTextFact("Learn More", "link", "page.tsx", 20),
          makeTextFact(
            "Another paragraph description that should not form a pseudo card pair.",
            "other",
            "page.tsx",
            23,
          ),
          makeTextFact("Sign Up", "button", "page.tsx", 30),
          makeTextFact(
            "Yet another paragraph description that should not create a card pair.",
            "other",
            "page.tsx",
            33,
          ),
        ],
      });

      const result = cardCarnival.analyze(ctx);
      expect(result.score).toBe(0);
    });

    it("prefers heading+paragraph pairs when enough are found (>=3)", () => {
      const ctx = makeContext({
        texts: [
          // 3 proper heading+paragraph pairs
          makeTextFact("Feature One", "heading", "page.tsx", 10),
          makeTextFact(
            "Description of feature one that is long enough for the pair.",
            "paragraph",
            "page.tsx",
            12,
          ),
          makeTextFact("Feature Two", "heading", "page.tsx", 20),
          makeTextFact(
            "Description of feature two that is long enough for the pair.",
            "paragraph",
            "page.tsx",
            22,
          ),
          makeTextFact("Feature Three", "heading", "page.tsx", 30),
          makeTextFact(
            "Description of feature three that is long enough for the pair.",
            "paragraph",
            "page.tsx",
            32,
          ),
          // Extra "other" texts that could form pseudo-cards but should not override
          makeTextFact("Extra Title", "other", "page.tsx", 50),
          makeTextFact(
            "Extra description that is long enough to potentially form pseudo card.",
            "other",
            "page.tsx",
            53,
          ),
        ],
      });

      const result = cardCarnival.analyze(ctx);
      expect(result.score).toBeGreaterThanOrEqual(0.3);
      // Should have exactly 1 evidence entry for the 3-card cluster
      expect(result.evidence.length).toBe(1);
      expect(result.evidence[0].summary).toContain("3 repeated card pattern");
    });
  });

  describe("feature-grid boost", () => {
    it("boosts score when feature-grid section is present", () => {
      const texts = [];
      for (let i = 0; i < 3; i++) {
        const base = 10 + i * 10;
        texts.push(
          makeTextFact(`Feature ${i + 1}`, "heading", "page.tsx", base),
        );
        texts.push(
          makeTextFact(
            `This is a longer description of feature ${i + 1} that explains it fully.`,
            "paragraph",
            "page.tsx",
            base + 2,
          ),
        );
      }

      const withoutGrid = cardCarnival.analyze(makeContext({ texts }));
      const withGrid = cardCarnival.analyze(
        makeContext({
          texts,
          structures: [makeStructuralFact("feature-grid", "page.tsx", 1)],
        }),
      );

      expect(withGrid.score).toBeGreaterThan(withoutGrid.score);
    });
  });

  describe("edge cases", () => {
    it("returns score 0 with no texts", () => {
      const result = cardCarnival.analyze(makeContext({}));
      expect(result.score).toBe(0);
      expect(result.status).toBe("insufficient_data");
    });

    it("returns score 0 when fewer than 3 cards detected", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Feature One", "heading", "page.tsx", 10),
          makeTextFact(
            "Description of feature one with some extra text added.",
            "paragraph",
            "page.tsx",
            12,
          ),
          makeTextFact("Feature Two", "heading", "page.tsx", 20),
          makeTextFact(
            "Description of feature two with some extra text added.",
            "paragraph",
            "page.tsx",
            22,
          ),
        ],
      });

      const result = cardCarnival.analyze(ctx);
      expect(result.score).toBe(0);
    });
  });
});
