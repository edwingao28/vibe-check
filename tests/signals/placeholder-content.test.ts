import { describe, it, expect } from "vitest";
import { placeholderContent } from "../../src/signals/placeholder-content.js";
import { makeContext, makeTextFact } from "./__helpers__/make-context.js";

describe("Placeholder Content", () => {
  describe("high scores", () => {
    it("scores high with lorem ipsum text", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
              "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      const result = placeholderContent.analyze(ctx);
      // 3 lorem matches * weight 5 = 15 weighted hits => 15/15 = 1.0
      expect(result.score).toBe(1);
      expect(result.status).toBe("scored");
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it("scores high with multiple fake names", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "John Doe is our CEO. Jane Smith leads engineering. " +
              "Alex Johnson handles marketing. Sarah Wilson manages sales. " +
              "Mike Chen runs operations. Emily Davis is our CTO. " +
              "John Smith and Jane Doe are advisors.",
            "paragraph",
            "team.tsx",
            1,
          ),
        ],
      });

      const result = placeholderContent.analyze(ctx);
      // 8 fake name matches * weight 2 = 16 weighted hits => clamped to 1.0
      expect(result.score).toBe(1);
      expect(result.status).toBe("scored");
    });
  });

  describe("medium scores", () => {
    it("scores medium with placeholder metrics", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "We have 10,000+ happy customers with 99.9% uptime. " +
              "Plans start at $19.99/mo with 24/7 support. " +
              "Our platform is 50% faster than competitors with 100k+ users.",
            "paragraph",
            "pricing.tsx",
            1,
          ),
        ],
      });

      const result = placeholderContent.analyze(ctx);
      // 6 metric matches * weight 1 = 6 weighted hits => 6/15 = 0.4
      expect(result.score).toBeGreaterThan(0.3);
      expect(result.score).toBeLessThan(0.7);
      expect(result.status).toBe("scored");
    });
  });

  describe("low scores", () => {
    it("scores low with minimal placeholder text", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "Our application helps teams manage their projects efficiently. " +
              "Track tasks, set deadlines, and collaborate with your team. " +
              "One small placeholder element for the beta section.",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      const result = placeholderContent.analyze(ctx);
      // 1 "placeholder" match * weight 2 = 2 weighted hits => 2/15 ≈ 0.13
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(0.3);
    });
  });

  describe("zero score", () => {
    it("scores zero with real content and no placeholder patterns", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "Our application helps teams manage their projects. " +
              "Track tasks, set deadlines, and collaborate with your team. " +
              "Simple pricing, no surprises. Built by developers for developers.",
            "paragraph",
            "page.tsx",
            1,
          ),
          makeTextFact(
            "Get started in minutes. Import your existing data and " +
              "start organizing your work right away.",
            "paragraph",
            "page.tsx",
            10,
          ),
        ],
      });

      const result = placeholderContent.analyze(ctx);
      expect(result.score).toBe(0);
      expect(result.status).toBe("scored");
      expect(result.evidence).toHaveLength(0);
    });
  });

  describe("insufficient data", () => {
    it("returns insufficient_data with no texts", () => {
      const ctx = makeContext({});
      const result = placeholderContent.analyze(ctx);
      expect(result.score).toBe(0);
      expect(result.status).toBe("insufficient_data");
      expect(result.confidence).toBe("low");
      expect(result.evidence).toHaveLength(0);
    });
  });

  describe("specific pattern detection", () => {
    it("detects email placeholders like test@example.com", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "Contact us at test@example.com for more information. " +
              "Or reach out to support at admin@example.com.",
            "paragraph",
            "contact.tsx",
            1,
          ),
        ],
      });

      const result = placeholderContent.analyze(ctx);
      expect(result.score).toBeGreaterThan(0);
      // Should also match example.com from the domain pattern
      const detail = result.evidence[0]?.detail ?? "";
      expect(detail).toContain("generic placeholder");
    });

    it("detects 'coming soon' patterns", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "This feature is coming soon! We are working hard to deliver " +
              "the best experience. Stay tuned for updates.",
            "paragraph",
            "features.tsx",
            1,
          ),
        ],
      });

      const result = placeholderContent.analyze(ctx);
      expect(result.score).toBeGreaterThan(0);
      const detail = result.evidence[0]?.detail ?? "";
      expect(detail).toContain("generic placeholder");
    });
  });

  describe("weighted scoring", () => {
    it("lorem ipsum contributes more weight than fake names which contribute more than metrics", () => {
      // 1 lorem match = weight 5
      const loremCtx = makeContext({
        texts: [
          makeTextFact(
            "Some text with lorem ipsum embedded in it.",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      // 1 fake name match = weight 2
      const nameCtx = makeContext({
        texts: [
          makeTextFact(
            "Some text with John Doe mentioned in it.",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      // 1 metric match = weight 1
      const metricCtx = makeContext({
        texts: [
          makeTextFact(
            "Some text with 10,000+ users mentioned in it.",
            "paragraph",
            "page.tsx",
            1,
          ),
        ],
      });

      const loremResult = placeholderContent.analyze(loremCtx);
      const nameResult = placeholderContent.analyze(nameCtx);
      const metricResult = placeholderContent.analyze(metricCtx);

      // lorem (5/15) > fake name (2/15) > metric (1/15)
      expect(loremResult.score).toBeGreaterThan(nameResult.score);
      expect(nameResult.score).toBeGreaterThan(metricResult.score);
    });
  });

  describe("evidence", () => {
    it("evidence shows which pattern categories were found", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "Lorem ipsum dolor sit amet. Contact John Doe at test@example.com. " +
              "We have 10,000+ customers. Coming soon: new features!",
            "paragraph",
            "landing.tsx",
            1,
          ),
        ],
      });

      const result = placeholderContent.analyze(ctx);
      expect(result.evidence.length).toBeGreaterThan(0);

      const detail = result.evidence[0]?.detail ?? "";
      // Should mention all four categories
      expect(detail).toContain("lorem ipsum");
      expect(detail).toContain("fake names");
      expect(detail).toContain("placeholder metrics");
      expect(detail).toContain("generic placeholder");
    });

    it("evidence includes file names", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact(
            "Lorem ipsum content here.",
            "paragraph",
            "dashboard.tsx",
            5,
          ),
        ],
      });

      const result = placeholderContent.analyze(ctx);
      expect(result.evidence[0]?.files).toContain("dashboard.tsx");
    });
  });

  describe("signal definition", () => {
    it("has correct id, name, and category", () => {
      expect(placeholderContent.id).toBe("placeholder-content");
      expect(placeholderContent.name).toBe("Placeholder Content");
      expect(placeholderContent.category).toBe("content");
    });

    it("needs tailwind and inline extractors", () => {
      expect(placeholderContent.needs).toEqual(["tailwind", "inline"]);
    });

    it("is not attenuatable", () => {
      expect(placeholderContent.attenuatable).toBe(false);
    });
  });

  describe("multi-page analysis", () => {
    it("takes the worst page score across multiple files", () => {
      const ctx = makeContext({
        texts: [
          // Clean page
          makeTextFact(
            "Real content about software development practices.",
            "paragraph",
            "clean.tsx",
            1,
          ),
          // Placeholder-heavy page
          makeTextFact(
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
              "John Doe and Jane Smith are our team leads.",
            "paragraph",
            "sloppy.tsx",
            1,
          ),
        ],
      });

      const result = placeholderContent.analyze(ctx);
      expect(result.score).toBeGreaterThan(0);
      // Evidence should reference the sloppy page
      const sloppyEvidence = result.evidence.find((e) =>
        e.files.includes("sloppy.tsx"),
      );
      expect(sloppyEvidence).toBeDefined();
      // Clean page should not appear in evidence
      const cleanEvidence = result.evidence.find((e) =>
        e.files.includes("clean.tsx"),
      );
      expect(cleanEvidence).toBeUndefined();
    });
  });
});
