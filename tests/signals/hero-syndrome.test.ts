import { describe, it, expect } from "vitest";
import { heroSyndrome } from "../../src/signals/hero-syndrome.js";
import { makeContext, makeTextFact, makeStructuralFact } from "./__helpers__/make-context.js";

describe("Hero Syndrome", () => {
  describe("with StructuralFacts", () => {
    it("scores 1.0 for exact hero template (1 heading + 1 paragraph + 1 button)", () => {
      const ctx = makeContext({
        structures: [
          makeStructuralFact("hero", "page.tsx", 1),
        ],
        texts: [
          makeTextFact("Welcome to Our Platform", "heading", "page.tsx", 5),
          makeTextFact("The best solution for your needs", "paragraph", "page.tsx", 10),
          makeTextFact("Get Started", "button", "page.tsx", 15),
        ],
      });

      const result = heroSyndrome.analyze(ctx);
      expect(result.score).toBe(1.0);
      expect(result.status).toBe("scored");
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.evidence[0].summary).toContain("Exact hero template");
    });

    it("scores 0.5 for partial match (heading + button, no paragraph)", () => {
      const ctx = makeContext({
        structures: [
          makeStructuralFact("hero", "page.tsx", 1),
        ],
        texts: [
          makeTextFact("Welcome", "heading", "page.tsx", 5),
          makeTextFact("Get Started", "button", "page.tsx", 15),
        ],
      });

      const result = heroSyndrome.analyze(ctx);
      expect(result.score).toBe(0.5);
      expect(result.evidence[0].summary).toContain("Partial hero pattern");
    });

    it("scores 0 when hero has only a heading", () => {
      const ctx = makeContext({
        structures: [
          makeStructuralFact("hero", "page.tsx", 1),
        ],
        texts: [
          makeTextFact("Welcome", "heading", "page.tsx", 5),
        ],
      });

      const result = heroSyndrome.analyze(ctx);
      expect(result.score).toBe(0);
    });

    it("uses first section as hero when no explicit hero sectionType", () => {
      const ctx = makeContext({
        structures: [
          makeStructuralFact("unknown", "page.tsx", 1),
          makeStructuralFact("feature-grid", "page.tsx", 50),
        ],
        texts: [
          makeTextFact("Welcome to Our App", "heading", "page.tsx", 5),
          makeTextFact("A great platform", "paragraph", "page.tsx", 10),
          makeTextFact("Sign Up", "button", "page.tsx", 15),
        ],
      });

      const result = heroSyndrome.analyze(ctx);
      expect(result.score).toBe(1.0);
    });

    it("does not match text from far away lines", () => {
      const ctx = makeContext({
        structures: [
          makeStructuralFact("hero", "page.tsx", 1),
        ],
        texts: [
          makeTextFact("Welcome", "heading", "page.tsx", 5),
          makeTextFact("A paragraph", "paragraph", "page.tsx", 200),
          makeTextFact("Click here", "button", "page.tsx", 300),
        ],
      });

      const result = heroSyndrome.analyze(ctx);
      // Only heading is within range of hero line (1 to 51)
      // paragraph at 200 and button at 300 are out of range
      expect(result.score).toBe(0);
    });
  });

  describe("text-only fallback (no StructuralFacts)", () => {
    it("scores 1.0 for h1+p+button in first 50 lines", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Welcome to the Future", "heading", "page.tsx", 5),
          makeTextFact("Transform your workflow", "paragraph", "page.tsx", 10),
          makeTextFact("Get Started", "button", "page.tsx", 20),
        ],
      });

      const result = heroSyndrome.analyze(ctx);
      expect(result.score).toBe(1.0);
    });

    it("scores 0 when text is beyond line 50", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Welcome", "heading", "page.tsx", 60),
          makeTextFact("Description", "paragraph", "page.tsx", 70),
          makeTextFact("Click", "button", "page.tsx", 80),
        ],
      });

      const result = heroSyndrome.analyze(ctx);
      expect(result.score).toBe(0);
    });

    it("scores 0.5 for partial match in fallback mode", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Welcome", "heading", "page.tsx", 5),
          makeTextFact("Click here", "button", "page.tsx", 10),
        ],
      });

      const result = heroSyndrome.analyze(ctx);
      expect(result.score).toBe(0.5);
    });
  });

  describe("edge cases", () => {
    it("returns score 0 with empty context", () => {
      const ctx = makeContext({});
      const result = heroSyndrome.analyze(ctx);
      expect(result.score).toBe(0);
      expect(result.status).toBe("scored");
      expect(result.confidence).toBe("low");
    });

    it("returns score 0 when only paragraphs exist", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Some text", "paragraph", "page.tsx", 5),
          makeTextFact("More text", "paragraph", "page.tsx", 10),
        ],
      });

      const result = heroSyndrome.analyze(ctx);
      expect(result.score).toBe(0);
    });

    it("handles multiple pages and takes the max score", () => {
      const ctx = makeContext({
        texts: [
          // page1: exact template
          makeTextFact("Welcome", "heading", "page1.tsx", 5),
          makeTextFact("Description", "paragraph", "page1.tsx", 10),
          makeTextFact("CTA", "button", "page1.tsx", 15),
          // page2: no hero pattern
          makeTextFact("About us text", "paragraph", "page2.tsx", 5),
        ],
      });

      const result = heroSyndrome.analyze(ctx);
      expect(result.score).toBe(1.0);
    });

    it("scores 0.5 when multiple headings exist (not exact template)", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Title 1", "heading", "page.tsx", 5),
          makeTextFact("Title 2", "heading", "page.tsx", 8),
          makeTextFact("Description", "paragraph", "page.tsx", 10),
          makeTextFact("CTA", "button", "page.tsx", 15),
        ],
      });

      const result = heroSyndrome.analyze(ctx);
      // Has all 3 components but headingCount > 1 so not exact
      expect(result.score).toBe(0.5);
    });

    it("has correct metadata", () => {
      const result = heroSyndrome.analyze(makeContext({}));
      expect(result.id).toBe("hero-syndrome");
      expect(result.name).toBe("Hero Syndrome");
      expect(result.category).toBe("content");
    });
  });

  describe("signal definition", () => {
    it("has correct id and category", () => {
      expect(heroSyndrome.id).toBe("hero-syndrome");
      expect(heroSyndrome.category).toBe("content");
    });

    it("is not attenuatable", () => {
      expect(heroSyndrome.attenuatable).toBe(false);
    });

    it("needs tailwind and inline extractors", () => {
      expect(heroSyndrome.needs).toEqual(["tailwind", "inline"]);
    });
  });
});
