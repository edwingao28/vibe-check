import { describe, it, expect } from "vitest";
import { ctaMania } from "../../src/signals/cta-mania.js";
import { makeContext, makeTextFact } from "./__helpers__/make-context.js";

describe("CTA Mania", () => {
  describe("high scores (excessive CTAs)", () => {
    it("scores high when a page has 8 CTA buttons", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Get Started", "button", "page.tsx", 10),
          makeTextFact("Try Free", "button", "page.tsx", 20),
          makeTextFact("Sign Up Now", "button", "page.tsx", 30),
          makeTextFact("Start Trial", "button", "page.tsx", 40),
          makeTextFact("Join Today", "button", "page.tsx", 50),
          makeTextFact("Learn More", "button", "page.tsx", 60),
          makeTextFact("Buy Now", "button", "page.tsx", 70),
          makeTextFact("Subscribe", "button", "page.tsx", 80),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // (8 - 3) / 5 = 1.0
      expect(result.score).toBe(1.0);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it("scores 0.6 with 6 buttons on a page", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Get Started", "button", "page.tsx", 10),
          makeTextFact("Try Free", "button", "page.tsx", 20),
          makeTextFact("Sign Up", "button", "page.tsx", 30),
          makeTextFact("Learn More", "button", "page.tsx", 40),
          makeTextFact("Contact Us", "button", "page.tsx", 50),
          makeTextFact("View Demo", "button", "page.tsx", 60),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // (6 - 3) / 5 = 0.6
      expect(result.score).toBeCloseTo(0.6);
    });

    it("counts non-nav links as CTAs", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Get Started Today", "link", "page.tsx", 10),
          makeTextFact("Try Our Platform", "link", "page.tsx", 20),
          makeTextFact("Download Now", "link", "page.tsx", 30),
          makeTextFact("View Demo", "link", "page.tsx", 40),
          makeTextFact("Start Free Trial", "link", "page.tsx", 50),
          makeTextFact("Request Access", "link", "page.tsx", 60),
        ],
      });

      const result = ctaMania.analyze(ctx);
      expect(result.score).toBeCloseTo(0.6);
    });
  });

  describe("low scores (reasonable CTAs)", () => {
    it("scores 0 with 2 buttons (below threshold)", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Get Started", "button", "page.tsx", 10),
          makeTextFact("Learn More", "button", "page.tsx", 20),
        ],
      });

      const result = ctaMania.analyze(ctx);
      expect(result.score).toBe(0);
    });

    it("scores 0 with exactly 3 buttons", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Get Started", "button", "page.tsx", 10),
          makeTextFact("Learn More", "button", "page.tsx", 20),
          makeTextFact("Contact", "button", "page.tsx", 30),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // (3 - 3) / 5 = 0
      expect(result.score).toBe(0);
    });

    it("scores 0 with no buttons", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Welcome to our site", "heading", "page.tsx", 1),
          makeTextFact("Some description", "paragraph", "page.tsx", 10),
        ],
      });

      const result = ctaMania.analyze(ctx);
      expect(result.score).toBe(0);
    });
  });

  describe("nav link filtering", () => {
    it("skips common nav links", () => {
      const ctx = makeContext({
        texts: [
          // These should be filtered as nav links
          makeTextFact("Home", "link", "page.tsx", 1),
          makeTextFact("About", "link", "page.tsx", 2),
          makeTextFact("Contact", "link", "page.tsx", 3),
          makeTextFact("Blog", "link", "page.tsx", 4),
          makeTextFact("FAQ", "link", "page.tsx", 5),
          makeTextFact("Pricing", "link", "page.tsx", 6),
          // These are actual CTAs (not nav-like)
          makeTextFact("Get Started Now", "button", "page.tsx", 50),
          makeTextFact("Try It Free", "button", "page.tsx", 60),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Only 2 non-nav CTAs, should be below threshold
      expect(result.score).toBe(0);
    });

    it("counts buttons even with nav-like text", () => {
      // Buttons are always counted regardless of text
      const ctx = makeContext({
        texts: [
          makeTextFact("Home", "button", "page.tsx", 1),
          makeTextFact("About", "button", "page.tsx", 2),
          makeTextFact("Contact", "button", "page.tsx", 3),
          makeTextFact("Get Started", "button", "page.tsx", 4),
          makeTextFact("Sign Up", "button", "page.tsx", 5),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // All 5 buttons count (buttons are not filtered)
      expect(result.score).toBeCloseTo(0.4);
    });
  });

  describe("multi-page behavior", () => {
    it("takes the worst page score", () => {
      const ctx = makeContext({
        texts: [
          // Page 1: 2 buttons (normal)
          makeTextFact("Get Started", "button", "page1.tsx", 10),
          makeTextFact("Learn More", "button", "page1.tsx", 20),
          // Page 2: 7 buttons (excessive)
          makeTextFact("Sign Up", "button", "page2.tsx", 10),
          makeTextFact("Try Free", "button", "page2.tsx", 20),
          makeTextFact("Buy Now", "button", "page2.tsx", 30),
          makeTextFact("Download", "button", "page2.tsx", 40),
          makeTextFact("Subscribe", "button", "page2.tsx", 50),
          makeTextFact("Join", "button", "page2.tsx", 60),
          makeTextFact("Contact", "button", "page2.tsx", 70),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Worst page: page2 with 7 buttons → (7-3)/5 = 0.8
      expect(result.score).toBeCloseTo(0.8);
    });

    it("reports evidence for flagged pages only", () => {
      const ctx = makeContext({
        texts: [
          // Page 1: 2 buttons (normal, no evidence)
          makeTextFact("Get Started", "button", "page1.tsx", 10),
          makeTextFact("Learn More", "button", "page1.tsx", 20),
          // Page 2: 5 buttons (flagged, should have evidence)
          makeTextFact("Sign Up", "button", "page2.tsx", 10),
          makeTextFact("Try Free", "button", "page2.tsx", 20),
          makeTextFact("Buy Now", "button", "page2.tsx", 30),
          makeTextFact("Download", "button", "page2.tsx", 40),
          makeTextFact("Subscribe", "button", "page2.tsx", 50),
        ],
      });

      const result = ctaMania.analyze(ctx);
      expect(result.evidence.length).toBe(1);
      expect(result.evidence[0].files).toContain("page2.tsx");
      expect(result.evidence[0].summary).toContain("5 CTA");
    });
  });

  describe("edge cases", () => {
    it("returns score 0 with empty context", () => {
      const ctx = makeContext({});
      const result = ctaMania.analyze(ctx);
      expect(result.score).toBe(0);
      expect(result.confidence).toBe("low");
    });

    it("clamps score to 1.0 max", () => {
      const buttons = Array.from({ length: 15 }, (_, i) =>
        makeTextFact(`Button ${i}`, "button", "page.tsx", i * 10),
      );

      const ctx = makeContext({ texts: buttons });
      const result = ctaMania.analyze(ctx);
      // (15 - 3) / 5 = 2.4, clamped to 1.0
      expect(result.score).toBe(1.0);
    });

    it("has correct metadata", () => {
      const result = ctaMania.analyze(makeContext({}));
      expect(result.id).toBe("cta-mania");
      expect(result.name).toBe("CTA Mania");
      expect(result.category).toBe("structure");
    });
  });

  describe("signal definition", () => {
    it("has correct id and category", () => {
      expect(ctaMania.id).toBe("cta-mania");
      expect(ctaMania.category).toBe("structure");
    });

    it("is not attenuatable", () => {
      expect(ctaMania.attenuatable).toBe(false);
    });

    it("needs tailwind and inline extractors", () => {
      expect(ctaMania.needs).toEqual(["tailwind", "inline"]);
    });
  });
});
