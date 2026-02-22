import { describe, it, expect } from "vitest";
import { cookieCutterLayout } from "../../src/signals/cookie-cutter-layout.js";
import { makeContext, makeStructuralFact } from "./__helpers__/make-context.js";

describe("Cookie Cutter Layout", () => {
  describe("high scores (identical layouts)", () => {
    it("scores high when 3 pages have identical structure", () => {
      const ctx = makeContext({
        structures: [
          // Page 1: hero, feature-grid, testimonial, cta-block, footer
          makeStructuralFact("hero", "page1.tsx", 1),
          makeStructuralFact("feature-grid", "page1.tsx", 50),
          makeStructuralFact("testimonial-section", "page1.tsx", 100),
          makeStructuralFact("cta-block", "page1.tsx", 150),
          makeStructuralFact("footer", "page1.tsx", 200),
          // Page 2: same structure
          makeStructuralFact("hero", "page2.tsx", 1),
          makeStructuralFact("feature-grid", "page2.tsx", 50),
          makeStructuralFact("testimonial-section", "page2.tsx", 100),
          makeStructuralFact("cta-block", "page2.tsx", 150),
          makeStructuralFact("footer", "page2.tsx", 200),
          // Page 3: same structure
          makeStructuralFact("hero", "page3.tsx", 1),
          makeStructuralFact("feature-grid", "page3.tsx", 50),
          makeStructuralFact("testimonial-section", "page3.tsx", 100),
          makeStructuralFact("cta-block", "page3.tsx", 150),
          makeStructuralFact("footer", "page3.tsx", 200),
        ],
      });

      const result = cookieCutterLayout.analyze(ctx);
      // Jaccard similarity = 1.0 (identical), minus 0.3 baseline = 0.7
      expect(result.score).toBe(0.7);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it("scores high when 2 pages are identical", () => {
      const ctx = makeContext({
        structures: [
          makeStructuralFact("hero", "page1.tsx", 1),
          makeStructuralFact("feature-grid", "page1.tsx", 50),
          makeStructuralFact("footer", "page1.tsx", 100),

          makeStructuralFact("hero", "page2.tsx", 1),
          makeStructuralFact("feature-grid", "page2.tsx", 50),
          makeStructuralFact("footer", "page2.tsx", 100),
        ],
      });

      const result = cookieCutterLayout.analyze(ctx);
      // Jaccard = 1.0, score = 1.0 - 0.3 = 0.7
      expect(result.score).toBe(0.7);
    });
  });

  describe("low scores (varied layouts)", () => {
    it("scores 0 when pages have completely different structures", () => {
      const ctx = makeContext({
        structures: [
          // Page 1: hero + feature-grid
          makeStructuralFact("hero", "page1.tsx", 1),
          makeStructuralFact("feature-grid", "page1.tsx", 50),

          // Page 2: pricing + faq + contact
          makeStructuralFact("pricing", "page2.tsx", 1),
          makeStructuralFact("faq", "page2.tsx", 50),
          makeStructuralFact("contact", "page2.tsx", 100),
        ],
      });

      const result = cookieCutterLayout.analyze(ctx);
      // Jaccard = 0 (no overlap), score = 0 - 0.3 = -0.3 clamped to 0
      expect(result.score).toBe(0);
    });

    it("scores low when pages have some overlap but are mostly different", () => {
      const ctx = makeContext({
        structures: [
          // Page 1
          makeStructuralFact("hero", "page1.tsx", 1),
          makeStructuralFact("feature-grid", "page1.tsx", 50),
          makeStructuralFact("testimonial-section", "page1.tsx", 100),
          makeStructuralFact("footer", "page1.tsx", 150),

          // Page 2: shares only footer
          makeStructuralFact("about", "page2.tsx", 1),
          makeStructuralFact("stats", "page2.tsx", 50),
          makeStructuralFact("contact", "page2.tsx", 100),
          makeStructuralFact("footer", "page2.tsx", 150),
        ],
      });

      const result = cookieCutterLayout.analyze(ctx);
      // Jaccard: intersection = 1 (footer), union = 7 => ~0.14
      // score = 0.14 - 0.3 = negative, clamped to 0
      expect(result.score).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("scores 0 with only 1 page (can not compare)", () => {
      const ctx = makeContext({
        structures: [
          makeStructuralFact("hero", "page1.tsx", 1),
          makeStructuralFact("feature-grid", "page1.tsx", 50),
          makeStructuralFact("footer", "page1.tsx", 100),
        ],
      });

      const result = cookieCutterLayout.analyze(ctx);
      expect(result.score).toBe(0);
    });

    it("returns insufficient_data with no structural facts", () => {
      const ctx = makeContext({});
      const result = cookieCutterLayout.analyze(ctx);
      expect(result.score).toBe(0);
      expect(result.status).toBe("insufficient_data");
      expect(result.confidence).toBe("low");
    });

    it("handles partially overlapping pages", () => {
      const ctx = makeContext({
        structures: [
          // Page 1: hero + feature-grid + footer
          makeStructuralFact("hero", "page1.tsx", 1),
          makeStructuralFact("feature-grid", "page1.tsx", 50),
          makeStructuralFact("footer", "page1.tsx", 100),

          // Page 2: hero + pricing + footer
          makeStructuralFact("hero", "page2.tsx", 1),
          makeStructuralFact("pricing", "page2.tsx", 50),
          makeStructuralFact("footer", "page2.tsx", 100),
        ],
      });

      const result = cookieCutterLayout.analyze(ctx);
      // Jaccard: intersection = {hero, footer} = 2, union = {hero, feature-grid, footer, pricing} = 4
      // Jaccard = 2/4 = 0.5, score = 0.5 - 0.3 = 0.2
      expect(result.score).toBeCloseTo(0.2, 1);
    });
  });

  describe("score clamping", () => {
    it("score is clamped to [0, 1]", () => {
      // Even with identical pages, score should not exceed 1
      const ctx = makeContext({
        structures: [
          makeStructuralFact("hero", "page1.tsx", 1),
          makeStructuralFact("hero", "page2.tsx", 1),
        ],
      });

      const result = cookieCutterLayout.analyze(ctx);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe("signal definition", () => {
    it("has correct id and category", () => {
      expect(cookieCutterLayout.id).toBe("cookie-cutter-layout");
      expect(cookieCutterLayout.category).toBe("structure");
    });

    it("is not attenuatable", () => {
      expect(cookieCutterLayout.attenuatable).toBe(false);
    });

    it("needs tailwind and inline extractors", () => {
      expect(cookieCutterLayout.needs).toEqual(["tailwind", "inline"]);
    });
  });
});
