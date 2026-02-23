import { describe, it, expect } from "vitest";
import { ctaMania } from "../../src/signals/cta-mania.js";
import { makeContext, makeTextFact } from "./__helpers__/make-context.js";

describe("CTA Mania", () => {
  describe("high scores (excessive CTAs on marketing pages)", () => {
    it("scores high when a marketing page has 8 CTA buttons", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Get Started", "button", "landing-page.tsx", 10),
          makeTextFact("Try Free", "button", "landing-page.tsx", 20),
          makeTextFact("Sign Up Now", "button", "landing-page.tsx", 30),
          makeTextFact("Start Trial", "button", "landing-page.tsx", 40),
          makeTextFact("Join Today", "button", "landing-page.tsx", 50),
          makeTextFact("Learn More", "button", "landing-page.tsx", 60),
          makeTextFact("Buy Now", "button", "landing-page.tsx", 70),
          makeTextFact("Subscribe", "button", "landing-page.tsx", 80),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Marketing page: (8 - 3) / 5 = 1.0
      expect(result.score).toBe(1.0);
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it("scores 0.6 with 6 CTA buttons on a marketing page", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Get Started", "button", "home-page.tsx", 10),
          makeTextFact("Try Free", "button", "home-page.tsx", 20),
          makeTextFact("Discover More", "button", "home-page.tsx", 30),
          makeTextFact("Learn More", "button", "home-page.tsx", 40),
          makeTextFact("Contact Us", "button", "home-page.tsx", 50),
          makeTextFact("View Demo", "button", "home-page.tsx", 60),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Marketing page: (6 - 3) / 5 = 0.6
      expect(result.score).toBeCloseTo(0.6);
    });

    it("counts non-nav links as CTAs on marketing pages", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Get Started Today", "link", "index.tsx", 10),
          makeTextFact("Try Our Platform", "link", "index.tsx", 20),
          makeTextFact("Download Now", "link", "index.tsx", 30),
          makeTextFact("View Demo", "link", "index.tsx", 40),
          makeTextFact("Start Free Trial", "link", "index.tsx", 50),
          makeTextFact("Request Access", "link", "index.tsx", 60),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Marketing page (index): (6 - 3) / 5 = 0.6
      expect(result.score).toBeCloseTo(0.6);
    });
  });

  describe("app page scoring (more lenient)", () => {
    it("scores 0 for app page with 6 buttons (below app threshold)", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Get Started", "button", "dashboard.tsx", 10),
          makeTextFact("Try Free", "button", "dashboard.tsx", 20),
          makeTextFact("Discover More", "button", "dashboard.tsx", 30),
          makeTextFact("Learn More", "button", "dashboard.tsx", 40),
          makeTextFact("Contact Us", "button", "dashboard.tsx", 50),
          makeTextFact("View Demo", "button", "dashboard.tsx", 60),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // App page: (6 - 6) / 8 = 0
      expect(result.score).toBe(0);
    });

    it("uses lenient formula for app pages with many CTAs", () => {
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
      // App page: (8 - 6) / 8 = 0.25
      expect(result.score).toBeCloseTo(0.25);
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

    it("scores 0 with exactly 3 buttons on marketing page", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Get Started", "button", "landing.tsx", 10),
          makeTextFact("Learn More", "button", "landing.tsx", 20),
          makeTextFact("Contact Us", "button", "landing.tsx", 30),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Marketing page: (3 - 3) / 5 = 0
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
    it("skips common nav links from both buttons and links", () => {
      const ctx = makeContext({
        texts: [
          // These should be filtered as nav links
          makeTextFact("Home", "link", "landing.tsx", 1),
          makeTextFact("About", "link", "landing.tsx", 2),
          makeTextFact("Contact", "link", "landing.tsx", 3),
          makeTextFact("Blog", "link", "landing.tsx", 4),
          makeTextFact("FAQ", "link", "landing.tsx", 5),
          makeTextFact("Pricing", "link", "landing.tsx", 6),
          // Nav buttons also filtered
          makeTextFact("Home", "button", "landing.tsx", 7),
          makeTextFact("Sign Up", "button", "landing.tsx", 8),
          // These are actual CTAs (not nav-like)
          makeTextFact("Get Started Now", "button", "landing.tsx", 50),
          makeTextFact("Try It Free", "button", "landing.tsx", 60),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Only 2 non-nav CTAs, should be below marketing threshold of 3
      expect(result.score).toBe(0);
    });

    it("filters newly added nav patterns (sign up, register, login, dashboard, settings)", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Sign Up", "link", "landing.tsx", 1),
          makeTextFact("Register", "link", "landing.tsx", 2),
          makeTextFact("Log In", "link", "landing.tsx", 3),
          makeTextFact("Login", "link", "landing.tsx", 4),
          makeTextFact("Dashboard", "link", "landing.tsx", 5),
          makeTextFact("Settings", "link", "landing.tsx", 6),
          // One real CTA
          makeTextFact("Get Started Now", "button", "landing.tsx", 50),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Only 1 CTA after filtering
      expect(result.score).toBe(0);
    });
  });

  describe("app button filtering", () => {
    it("filters common app/functional buttons", () => {
      const ctx = makeContext({
        texts: [
          // App buttons - should be filtered
          makeTextFact("Edit", "button", "page.tsx", 10),
          makeTextFact("Save", "button", "page.tsx", 20),
          makeTextFact("Delete", "button", "page.tsx", 30),
          makeTextFact("Cancel", "button", "page.tsx", 40),
          makeTextFact("Submit", "button", "page.tsx", 50),
          makeTextFact("Configure Preferences", "button", "page.tsx", 60),
          makeTextFact("Preview", "button", "page.tsx", 70),
          makeTextFact("Manage Settings", "button", "page.tsx", 80),
          makeTextFact("Reset", "button", "page.tsx", 90),
          makeTextFact("Apply", "button", "page.tsx", 100),
          // Real CTAs
          makeTextFact("Get Started", "button", "page.tsx", 110),
          makeTextFact("Learn More", "button", "page.tsx", 120),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Only 2 CTAs after filtering 10 app buttons. App page: (2-6)/8 = 0
      expect(result.score).toBe(0);
    });

    it("filters app button links too", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Edit", "link", "page.tsx", 10),
          makeTextFact("Delete", "link", "page.tsx", 20),
          makeTextFact("View", "link", "page.tsx", 30),
          makeTextFact("Copy", "link", "page.tsx", 40),
        ],
      });

      const result = ctaMania.analyze(ctx);
      expect(result.score).toBe(0);
    });

    it("reports filtered app buttons in evidence", () => {
      const ctx = makeContext({
        texts: [
          // App buttons that get filtered
          makeTextFact("Edit", "button", "settings.tsx", 10),
          makeTextFact("Save", "button", "settings.tsx", 20),
          makeTextFact("Delete", "button", "settings.tsx", 30),
          // One real CTA (not enough to flag)
          makeTextFact("Upgrade Plan", "button", "settings.tsx", 40),
        ],
      });

      const result = ctaMania.analyze(ctx);
      expect(result.score).toBe(0);
      // Should have evidence about filtered app buttons
      const filteredEvidence = result.evidence.find((e) =>
        e.summary.includes("app buttons excluded"),
      );
      expect(filteredEvidence).toBeDefined();
      expect(filteredEvidence!.summary).toContain("3 app buttons excluded");
    });

    it("does not filter buttons with non-exact app text", () => {
      const ctx = makeContext({
        texts: [
          // These should NOT be filtered (not exact app button matches)
          makeTextFact("Edit Profile Photo", "button", "landing.tsx", 10),
          makeTextFact("Save 50% Today", "button", "landing.tsx", 20),
          makeTextFact("Delete Your Worries", "button", "landing.tsx", 30),
          makeTextFact("View Demo", "button", "landing.tsx", 40),
          makeTextFact("Get Started", "button", "landing.tsx", 50),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // "Edit Profile Photo" does not match /^edit$/i (extra text)
      // "Save 50% Today" does not match /^save$/i
      // "Delete Your Worries" does not match /^delete$/i
      // "View Demo" does not match /^view$/i
      // All 5 count as CTAs on a marketing page: (5-3)/5 = 0.4
      expect(result.score).toBeCloseTo(0.4);
    });

    it("filters prefix-match app patterns like configure and manage", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Configure Preferences", "button", "page.tsx", 10),
          makeTextFact("Configure API Keys", "button", "page.tsx", 20),
          makeTextFact("Manage Users", "button", "page.tsx", 30),
          makeTextFact("Manage Billing", "button", "page.tsx", 40),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // All filtered as app buttons
      expect(result.score).toBe(0);
    });
  });

  describe("marketing vs app page detection", () => {
    it("detects marketing pages by filename keywords", () => {
      const marketingFiles = [
        "landing-page.tsx",
        "home.tsx",
        "index.tsx",
        "marketing/hero.tsx",
        "components/hero-section.tsx",
        "pricing-page.tsx",
      ];

      for (const file of marketingFiles) {
        const ctx = makeContext({
          texts: [
            makeTextFact("CTA 1", "button", file, 10),
            makeTextFact("CTA 2", "button", file, 20),
            makeTextFact("CTA 3", "button", file, 30),
            makeTextFact("CTA 4", "button", file, 40),
            makeTextFact("CTA 5", "button", file, 50),
          ],
        });

        const result = ctaMania.analyze(ctx);
        // Marketing: (5-3)/5 = 0.4
        expect(result.score).toBeCloseTo(
          0.4,
          undefined,
          `Expected marketing score for ${file}`,
        );
      }
    });

    it("uses lenient scoring for non-marketing pages", () => {
      const appFiles = [
        "dashboard.tsx",
        "settings.tsx",
        "profile.tsx",
        "components/data-table.tsx",
      ];

      for (const file of appFiles) {
        const ctx = makeContext({
          texts: [
            makeTextFact("CTA 1", "button", file, 10),
            makeTextFact("CTA 2", "button", file, 20),
            makeTextFact("CTA 3", "button", file, 30),
            makeTextFact("CTA 4", "button", file, 40),
            makeTextFact("CTA 5", "button", file, 50),
          ],
        });

        const result = ctaMania.analyze(ctx);
        // App page: (5-6)/8 = 0 (below threshold)
        expect(result.score).toBe(0);
      }
    });

    it("prioritizes marketing page score over app page score", () => {
      const ctx = makeContext({
        texts: [
          // Marketing page with moderate CTAs
          makeTextFact("Get Started", "button", "landing.tsx", 10),
          makeTextFact("Try Free", "button", "landing.tsx", 20),
          makeTextFact("Learn More", "button", "landing.tsx", 30),
          makeTextFact("Join Now", "button", "landing.tsx", 40),
          makeTextFact("Subscribe", "button", "landing.tsx", 50),
          // App page with many CTAs
          makeTextFact("CTA 1", "button", "admin.tsx", 10),
          makeTextFact("CTA 2", "button", "admin.tsx", 20),
          makeTextFact("CTA 3", "button", "admin.tsx", 30),
          makeTextFact("CTA 4", "button", "admin.tsx", 40),
          makeTextFact("CTA 5", "button", "admin.tsx", 50),
          makeTextFact("CTA 6", "button", "admin.tsx", 60),
          makeTextFact("CTA 7", "button", "admin.tsx", 70),
          makeTextFact("CTA 8", "button", "admin.tsx", 80),
          makeTextFact("CTA 9", "button", "admin.tsx", 90),
          makeTextFact("CTA 10", "button", "admin.tsx", 100),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Marketing page: (5-3)/5 = 0.4
      // App page: (10-6)/8 = 0.5
      // Should use marketing page score (0.4) because it's positive
      expect(result.score).toBeCloseTo(0.4);
    });

    it("falls back to app page score when no marketing page has positive score", () => {
      const ctx = makeContext({
        texts: [
          // Marketing page with few CTAs (below threshold)
          makeTextFact("Get Started", "button", "landing.tsx", 10),
          makeTextFact("Learn More", "button", "landing.tsx", 20),
          // App page with many CTAs
          makeTextFact("CTA 1", "button", "admin.tsx", 10),
          makeTextFact("CTA 2", "button", "admin.tsx", 20),
          makeTextFact("CTA 3", "button", "admin.tsx", 30),
          makeTextFact("CTA 4", "button", "admin.tsx", 40),
          makeTextFact("CTA 5", "button", "admin.tsx", 50),
          makeTextFact("CTA 6", "button", "admin.tsx", 60),
          makeTextFact("CTA 7", "button", "admin.tsx", 70),
          makeTextFact("CTA 8", "button", "admin.tsx", 80),
          makeTextFact("CTA 9", "button", "admin.tsx", 90),
          makeTextFact("CTA 10", "button", "admin.tsx", 100),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Marketing page: (2-3)/5 = 0 (not positive)
      // Falls back to app page: (10-6)/8 = 0.5
      expect(result.score).toBeCloseTo(0.5);
    });
  });

  describe("multi-page behavior", () => {
    it("takes the worst marketing page score when multiple exist", () => {
      const ctx = makeContext({
        texts: [
          // Landing page: 4 CTAs
          makeTextFact("Get Started", "button", "landing.tsx", 10),
          makeTextFact("Try Free", "button", "landing.tsx", 20),
          makeTextFact("Learn More", "button", "landing.tsx", 30),
          makeTextFact("Join Now", "button", "landing.tsx", 40),
          // Home page: 8 CTAs (worst)
          makeTextFact("CTA 1", "button", "home.tsx", 10),
          makeTextFact("CTA 2", "button", "home.tsx", 20),
          makeTextFact("CTA 3", "button", "home.tsx", 30),
          makeTextFact("CTA 4", "button", "home.tsx", 40),
          makeTextFact("CTA 5", "button", "home.tsx", 50),
          makeTextFact("CTA 6", "button", "home.tsx", 60),
          makeTextFact("CTA 7", "button", "home.tsx", 70),
          makeTextFact("CTA 8", "button", "home.tsx", 80),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // Worst marketing page: home.tsx → (8-3)/5 = 1.0
      expect(result.score).toBe(1.0);
    });

    it("reports evidence for flagged pages only", () => {
      const ctx = makeContext({
        texts: [
          // Page 1: 2 CTAs on marketing page (normal, no evidence)
          makeTextFact("Get Started", "button", "landing.tsx", 10),
          makeTextFact("Learn More", "button", "landing.tsx", 20),
          // Page 2: 5 CTAs on marketing page (flagged)
          makeTextFact("Try Free", "button", "home.tsx", 10),
          makeTextFact("Buy Now", "button", "home.tsx", 20),
          makeTextFact("Download App", "button", "home.tsx", 30),
          makeTextFact("Subscribe", "button", "home.tsx", 40),
          makeTextFact("Join Today", "button", "home.tsx", 50),
        ],
      });

      const result = ctaMania.analyze(ctx);
      const ctaEvidence = result.evidence.filter((e) =>
        e.summary.includes("CTA elements"),
      );
      expect(ctaEvidence.length).toBe(1);
      expect(ctaEvidence[0].files).toContain("home.tsx");
      expect(ctaEvidence[0].summary).toContain("5 CTA");
    });
  });

  describe("edge cases", () => {
    it("returns insufficient_data with empty context", () => {
      const ctx = makeContext({});
      const result = ctaMania.analyze(ctx);
      expect(result.score).toBe(0);
      expect(result.status).toBe("insufficient_data");
      expect(result.confidence).toBe("low");
    });

    it("clamps score to 1.0 max", () => {
      const buttons = Array.from({ length: 15 }, (_, i) =>
        makeTextFact(`Button ${i}`, "button", "page.tsx", i * 10),
      );

      const ctx = makeContext({ texts: buttons });
      const result = ctaMania.analyze(ctx);
      // App page: (15 - 6) / 8 = 1.125, clamped to 1.0
      expect(result.score).toBe(1.0);
    });

    it("clamps marketing page score to 1.0 max", () => {
      const buttons = Array.from({ length: 15 }, (_, i) =>
        makeTextFact(`Button ${i}`, "button", "landing.tsx", i * 10),
      );

      const ctx = makeContext({ texts: buttons });
      const result = ctaMania.analyze(ctx);
      // Marketing page: (15 - 3) / 5 = 2.4, clamped to 1.0
      expect(result.score).toBe(1.0);
    });

    it("has correct metadata", () => {
      const result = ctaMania.analyze(makeContext({}));
      expect(result.id).toBe("cta-mania");
      expect(result.name).toBe("CTA Mania");
      expect(result.category).toBe("structure");
    });

    it("handles all buttons being app buttons", () => {
      const ctx = makeContext({
        texts: [
          makeTextFact("Edit", "button", "page.tsx", 10),
          makeTextFact("Save", "button", "page.tsx", 20),
          makeTextFact("Delete", "button", "page.tsx", 30),
          makeTextFact("Cancel", "button", "page.tsx", 40),
          makeTextFact("Submit", "button", "page.tsx", 50),
          makeTextFact("Update", "button", "page.tsx", 60),
          makeTextFact("Remove", "button", "page.tsx", 70),
          makeTextFact("Add", "button", "page.tsx", 80),
          makeTextFact("Create", "button", "page.tsx", 90),
          makeTextFact("Copy", "button", "page.tsx", 100),
        ],
      });

      const result = ctaMania.analyze(ctx);
      // All filtered as app buttons, 0 CTAs
      expect(result.score).toBe(0);
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
