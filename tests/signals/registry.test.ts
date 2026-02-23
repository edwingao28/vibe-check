import { describe, it, expect } from "vitest";
import {
  runSignals,
  allSignals,
  tier1Signals,
  tier2Signals,
} from "../../src/signals/registry.js";
import {
  makeContext,
  makeFact,
  makeColor,
} from "./__helpers__/make-context.js";
import { DEFAULT_CONFIG } from "../../src/config/defaults.js";
import type { SlopConfig } from "../../src/config/types.js";

describe("Signal Registry", () => {
  it("runs all tier 1 signals when none are disabled", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "font-family", value: "Inter" }),
        makeFact({ property: "padding", value: "16px" }),
      ],
    });

    const results = runSignals(ctx, DEFAULT_CONFIG);

    // Should have results for all 18 signals (6 Tier 1 + 12 Tier 2)
    expect(results.length).toBe(18);

    const ids = results.map((r) => r.id);
    expect(ids).toContain("font-crime");
    expect(ids).toContain("purple-plague");
    expect(ids).toContain("whitespace-wasteland");
    expect(ids).toContain("shadow-realm");
    expect(ids).toContain("border-radius-maximum");
    expect(ids).toContain("gradient-overload");
    expect(ids).toContain("hero-syndrome");
    expect(ids).toContain("buzzword-bingo");
    expect(ids).toContain("cookie-cutter-layout");
    expect(ids).toContain("cta-mania");
    expect(ids).toContain("emoji-infestation");
    expect(ids).toContain("testimonial-factory");
    expect(ids).toContain("card-carnival");
    expect(ids).toContain("stock-photo-syndrome");
    expect(ids).toContain("scaffold-bloat");
    expect(ids).toContain("placeholder-content");
    expect(ids).toContain("ai-scaffold-signature");
    expect(ids).toContain("dead-dependency");
  });

  it("skips disabled signals", () => {
    const ctx = makeContext({
      facts: [makeFact({ property: "font-family", value: "Inter" })],
    });

    const config: SlopConfig = {
      ...DEFAULT_CONFIG,
      signals: {
        ...DEFAULT_CONFIG.signals,
        disabled: ["font-crime", "shadow-realm"],
      },
    };

    const results = runSignals(ctx, config);
    const ids = results.map((r) => r.id);

    expect(ids).not.toContain("font-crime");
    expect(ids).not.toContain("shadow-realm");
    expect(results.length).toBe(16); // 18 total - 2 disabled
  });

  it("returns insufficient_data when ALL dependencies failed", () => {
    const ctx = makeContext({
      facts: [makeFact({ property: "font-family", value: "Inter" })],
      extractorHealth: {
        css: "failed",
        tailwind: "failed",
        inline: "failed",
        "css-module": "failed",
      },
    });

    const results = runSignals(ctx, DEFAULT_CONFIG);

    // All signals should be insufficient_data since all extractors failed
    for (const result of results) {
      expect(result.status).toBe("insufficient_data");
      expect(result.confidence).toBe("low");
      expect(result.score).toBe(0);
    }
  });

  it("reduces confidence when some dependencies are degraded", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "font-family", value: "Inter" }),
        makeFact({ property: "padding", value: "16px" }),
      ],
      extractorHealth: {
        css: "healthy",
        tailwind: "degraded",
        inline: "healthy",
        "css-module": "healthy",
      },
    });

    const results = runSignals(ctx, DEFAULT_CONFIG);

    // Font crime needs ["css", "tailwind"] - one degraded → confidence should be "medium"
    const fontCrime = results.find((r) => r.id === "font-crime");
    expect(fontCrime).toBeDefined();
    expect(fontCrime!.confidence).toBe("medium");
  });

  it("runs signals normally when all dependencies are healthy", () => {
    const ctx = makeContext({
      facts: [makeFact({ property: "font-family", value: "Inter" })],
    });

    const results = runSignals(ctx, DEFAULT_CONFIG);

    const fontCrime = results.find((r) => r.id === "font-crime");
    expect(fontCrime).toBeDefined();
    expect(fontCrime!.status).toBe("scored");
    expect(fontCrime!.confidence).toBe("high");
  });

  it("marks purple plague as insufficient_data only when ALL its needs fail", () => {
    // Purple plague needs: ["css", "tailwind", "inline"]
    // If only inline fails, it should still run
    const ctx = makeContext({
      facts: [],
      colors: [
        makeColor({ hsl: [270, 50, 50] }),
        makeColor({ hsl: [280, 60, 40] }),
        makeColor({ hsl: [290, 70, 50] }),
        makeColor({ hsl: [275, 55, 45] }),
        makeColor({ hsl: [285, 65, 55] }),
      ],
      extractorHealth: {
        css: "healthy",
        tailwind: "healthy",
        inline: "failed",
        "css-module": "healthy",
      },
    });

    const results = runSignals(ctx, DEFAULT_CONFIG);
    const purplePlague = results.find((r) => r.id === "purple-plague");

    expect(purplePlague).toBeDefined();
    expect(purplePlague!.status).toBe("scored"); // NOT insufficient_data
    expect(purplePlague!.confidence).toBe("medium"); // Reduced due to degraded dep
  });

  it("exports tier1Signals, tier2Signals, and allSignals arrays", () => {
    expect(tier1Signals).toHaveLength(6);
    expect(tier2Signals).toHaveLength(12);
    expect(allSignals).toHaveLength(18);

    // allSignals should contain all tier1 and tier2 signals
    for (const signal of [...tier1Signals, ...tier2Signals]) {
      expect(allSignals.find((s) => s.id === signal.id)).toBeDefined();
    }
  });

  it("produces results with valid structure", () => {
    const ctx = makeContext({
      facts: [makeFact({ property: "font-family", value: "Inter" })],
    });

    const results = runSignals(ctx, DEFAULT_CONFIG);

    for (const result of results) {
      expect(result.id).toBeTruthy();
      expect(result.name).toBeTruthy();
      expect(result.category).toBeTruthy();
      expect(typeof result.score).toBe("number");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(typeof result.rawScore).toBe("number");
      expect(typeof result.attenuatedScore).toBe("number");
      expect(["scored", "insufficient_data"]).toContain(result.status);
      expect(["high", "medium", "low"]).toContain(result.confidence);
      expect(Array.isArray(result.evidence)).toBe(true);
    }
  });

  it("disabling all signals produces empty results", () => {
    const ctx = makeContext({
      facts: [makeFact({ property: "font-family", value: "Inter" })],
    });

    const config: SlopConfig = {
      ...DEFAULT_CONFIG,
      signals: {
        ...DEFAULT_CONFIG.signals,
        disabled: [
          "font-crime",
          "purple-plague",
          "whitespace-wasteland",
          "shadow-realm",
          "border-radius-maximum",
          "gradient-overload",
          "hero-syndrome",
          "buzzword-bingo",
          "cookie-cutter-layout",
          "cta-mania",
          "emoji-infestation",
          "testimonial-factory",
          "card-carnival",
          "stock-photo-syndrome",
          "scaffold-bloat",
          "placeholder-content",
          "ai-scaffold-signature",
          "dead-dependency",
        ],
      },
    };

    const results = runSignals(ctx, config);
    expect(results).toHaveLength(0);
  });
});
