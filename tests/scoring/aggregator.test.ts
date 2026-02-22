import { describe, it, expect } from "vitest";
import { aggregate } from "../../src/scoring/aggregator.js";
import type { SignalResult } from "../../src/signals/types.js";
import type { SlopConfig } from "../../src/config/types.js";
import { DEFAULT_CONFIG } from "../../src/config/defaults.js";

function makeSignal(
  id: string,
  attenuatedScore: number,
  overrides?: Partial<SignalResult>,
): SignalResult {
  return {
    id,
    name: id,
    category: "typography-color",
    score: attenuatedScore,
    rawScore: attenuatedScore,
    attenuatedScore,
    status: "scored",
    confidence: "high",
    evidence: [],
    ...overrides,
  };
}

describe("aggregate", () => {
  describe("power mean calculation (p=2)", () => {
    it("computes correct power mean for a single signal", () => {
      // Power mean of a single value is the value itself
      const signals: SignalResult[] = [
        makeSignal("font-crime", 0.8),
        // purple-plague not present -> only 1 of 2 signals in typography-color
        // but 50% <= 50%, so category is still valid
      ];

      const result = aggregate(signals, DEFAULT_CONFIG);
      const typoCat = result.categories.find(
        (c) => c.id === "typography-color",
      )!;
      // sqrt(0.8^2 / 1) = 0.8
      expect(typoCat.score).toBeCloseTo(0.8);
    });

    it("computes correct power mean for two signals", () => {
      const signals: SignalResult[] = [
        makeSignal("font-crime", 0.8),
        makeSignal("purple-plague", 0.4),
      ];

      const result = aggregate(signals, DEFAULT_CONFIG);
      const typoCat = result.categories.find(
        (c) => c.id === "typography-color",
      )!;
      // Power mean p=2: sqrt((0.8^2 + 0.4^2) / 2) = sqrt((0.64 + 0.16) / 2) = sqrt(0.4) ≈ 0.6325
      expect(typoCat.score).toBeCloseTo(Math.sqrt(0.4), 4);
    });

    it("computes correct power mean for spacing-effects category (4 signals)", () => {
      const signals: SignalResult[] = [
        makeSignal("whitespace-wasteland", 0.6, {
          category: "spacing-effects",
        }),
        makeSignal("shadow-realm", 0.4, { category: "spacing-effects" }),
        makeSignal("border-radius-maximum", 0.8, {
          category: "spacing-effects",
        }),
        makeSignal("gradient-overload", 0.2, { category: "spacing-effects" }),
      ];

      const result = aggregate(signals, DEFAULT_CONFIG);
      const spacingCat = result.categories.find(
        (c) => c.id === "spacing-effects",
      )!;
      // sqrt((0.36 + 0.16 + 0.64 + 0.04) / 4) = sqrt(1.2 / 4) = sqrt(0.3) ≈ 0.5477
      expect(spacingCat.score).toBeCloseTo(Math.sqrt(0.3), 4);
    });

    it("power mean emphasizes higher values (p=2 > arithmetic mean)", () => {
      const signals: SignalResult[] = [
        makeSignal("font-crime", 0.9),
        makeSignal("purple-plague", 0.1),
      ];

      const result = aggregate(signals, DEFAULT_CONFIG);
      const typoCat = result.categories.find(
        (c) => c.id === "typography-color",
      )!;

      // Arithmetic mean would be 0.5
      // Power mean p=2: sqrt((0.81 + 0.01) / 2) = sqrt(0.41) ≈ 0.6403
      const arithmeticMean = (0.9 + 0.1) / 2;
      expect(typoCat.score).toBeGreaterThan(arithmeticMean);
      expect(typoCat.score).toBeCloseTo(Math.sqrt(0.41), 4);
    });
  });

  describe("insufficient data handling", () => {
    it("skips signals with status 'insufficient_data'", () => {
      const signals: SignalResult[] = [
        makeSignal("font-crime", 0.8),
        makeSignal("purple-plague", 0.5, { status: "insufficient_data" }),
      ];

      const result = aggregate(signals, DEFAULT_CONFIG);
      const typoCat = result.categories.find(
        (c) => c.id === "typography-color",
      )!;
      // Only font-crime counts: sqrt(0.64 / 1) = 0.8
      expect(typoCat.score).toBeCloseTo(0.8);
    });

    it("excludes category when >50% signals are insufficient", () => {
      const signals: SignalResult[] = [
        makeSignal("font-crime", 0.8, { status: "insufficient_data" }),
        makeSignal("purple-plague", 0.5, { status: "insufficient_data" }),
      ];

      const result = aggregate(signals, DEFAULT_CONFIG);
      const typoCat = result.categories.find(
        (c) => c.id === "typography-color",
      )!;
      expect(Number.isNaN(typoCat.score)).toBe(true);
    });

    it("excludes category from overall when marked NaN", () => {
      // Typography category: both insufficient -> NaN -> excluded
      // Spacing category: all scored
      const signals: SignalResult[] = [
        makeSignal("font-crime", 0.8, { status: "insufficient_data" }),
        makeSignal("purple-plague", 0.5, { status: "insufficient_data" }),
        makeSignal("whitespace-wasteland", 0.5, {
          category: "spacing-effects",
        }),
        makeSignal("shadow-realm", 0.5, { category: "spacing-effects" }),
        makeSignal("border-radius-maximum", 0.5, {
          category: "spacing-effects",
        }),
        makeSignal("gradient-overload", 0.5, { category: "spacing-effects" }),
      ];

      const result = aggregate(signals, DEFAULT_CONFIG);
      // Only spacing-effects (weight=1.0) contributes
      // Power mean of all 0.5: sqrt((4 * 0.25) / 4) = sqrt(0.25) = 0.5
      // Overall: 100 * (1.0 * 0.5) / 1.0 = 50
      expect(result.slopScore).toBeCloseTo(50, 0);
    });
  });

  describe("overall score calculation", () => {
    it("computes weighted average of category scores", () => {
      const signals: SignalResult[] = [
        // typography-color: weight 1.0
        makeSignal("font-crime", 0.8),
        makeSignal("purple-plague", 0.6),
        // spacing-effects: weight 1.0
        makeSignal("whitespace-wasteland", 0.4, {
          category: "spacing-effects",
        }),
        makeSignal("shadow-realm", 0.4, { category: "spacing-effects" }),
        makeSignal("border-radius-maximum", 0.4, {
          category: "spacing-effects",
        }),
        makeSignal("gradient-overload", 0.4, { category: "spacing-effects" }),
        // content: weight 0.8
        makeSignal("buzzword-bingo", 0.3, { category: "content" }),
        makeSignal("hero-syndrome", 0.3, { category: "content" }),
        // structure: weight 0.8
        makeSignal("cookie-cutter-layout", 0.2, { category: "structure" }),
        makeSignal("cta-mania", 0.2, { category: "structure" }),
      ];

      const result = aggregate(signals, DEFAULT_CONFIG);

      // typography-color: sqrt((0.64+0.36)/2) = sqrt(0.5) ≈ 0.7071
      const typoScore = Math.sqrt(0.5);
      // spacing-effects: sqrt((4*0.16)/4) = 0.4
      const spacingScore = 0.4;
      // content: sqrt((2*0.09)/2) = 0.3
      const contentScore = 0.3;
      // structure: sqrt((2*0.04)/2) = 0.2
      const structureScore = 0.2;

      // Overall: 100 * (1.0*typo + 1.0*spacing + 0.8*content + 0.8*structure) / (1.0+1.0+0.8+0.8)
      const expected =
        (100 *
          (1.0 * typoScore +
            1.0 * spacingScore +
            0.8 * contentScore +
            0.8 * structureScore)) /
        (1.0 + 1.0 + 0.8 + 0.8);

      expect(result.slopScore).toBeCloseTo(expected, 1);
    });

    it("clamps score to 0-100 range", () => {
      // All signals at max score
      const signals: SignalResult[] = [
        makeSignal("font-crime", 1.0),
        makeSignal("purple-plague", 1.0),
        makeSignal("whitespace-wasteland", 1.0, {
          category: "spacing-effects",
        }),
        makeSignal("shadow-realm", 1.0, { category: "spacing-effects" }),
        makeSignal("border-radius-maximum", 1.0, {
          category: "spacing-effects",
        }),
        makeSignal("gradient-overload", 1.0, { category: "spacing-effects" }),
        makeSignal("buzzword-bingo", 1.0, { category: "content" }),
        makeSignal("hero-syndrome", 1.0, { category: "content" }),
        makeSignal("cookie-cutter-layout", 1.0, { category: "structure" }),
        makeSignal("cta-mania", 1.0, { category: "structure" }),
      ];

      const result = aggregate(signals, DEFAULT_CONFIG);
      expect(result.slopScore).toBeLessThanOrEqual(100);
      expect(result.slopScore).toBeCloseTo(100);
    });

    it("returns 0 when all categories are excluded", () => {
      // No signals at all
      const result = aggregate([], DEFAULT_CONFIG);
      expect(result.slopScore).toBe(0);
    });

    it("returns 0 when all signals are insufficient", () => {
      const signals: SignalResult[] = [
        makeSignal("font-crime", 0.8, { status: "insufficient_data" }),
        makeSignal("purple-plague", 0.8, { status: "insufficient_data" }),
      ];
      const result = aggregate(signals, DEFAULT_CONFIG);
      // All categories either NaN or have no scored signals
      expect(result.slopScore).toBe(0);
    });
  });

  describe("config overrides", () => {
    it("uses config-specified category weights", () => {
      const config: SlopConfig = {
        ...DEFAULT_CONFIG,
        signals: {
          ...DEFAULT_CONFIG.signals,
          categoryWeights: {
            "typography-color": 2.0, // Double weight
            "spacing-effects": 1.0,
            content: 0.8,
            structure: 0.8,
          },
        },
      };

      const signals: SignalResult[] = [
        makeSignal("font-crime", 0.8),
        makeSignal("purple-plague", 0.8),
        makeSignal("whitespace-wasteland", 0.2, {
          category: "spacing-effects",
        }),
        makeSignal("shadow-realm", 0.2, { category: "spacing-effects" }),
        makeSignal("border-radius-maximum", 0.2, {
          category: "spacing-effects",
        }),
        makeSignal("gradient-overload", 0.2, { category: "spacing-effects" }),
      ];

      const resultDefault = aggregate(signals, DEFAULT_CONFIG);
      const resultCustom = aggregate(signals, config);

      // The custom config gives double weight to typography-color (0.8 score)
      // vs spacing-effects (0.2 score), so overall should be higher
      expect(resultCustom.slopScore).toBeGreaterThan(resultDefault.slopScore);
    });
  });

  describe("category results", () => {
    it("returns all 4 categories in results", () => {
      const result = aggregate([], DEFAULT_CONFIG);
      expect(result.categories).toHaveLength(4);
      const ids = result.categories.map((c) => c.id);
      expect(ids).toContain("typography-color");
      expect(ids).toContain("spacing-effects");
      expect(ids).toContain("content");
      expect(ids).toContain("structure");
    });

    it("includes signal IDs in each category", () => {
      const result = aggregate([], DEFAULT_CONFIG);
      const typoCat = result.categories.find(
        (c) => c.id === "typography-color",
      )!;
      expect(typoCat.signals).toEqual(["font-crime", "purple-plague"]);

      const spacingCat = result.categories.find(
        (c) => c.id === "spacing-effects",
      )!;
      expect(spacingCat.signals).toEqual([
        "whitespace-wasteland",
        "shadow-realm",
        "border-radius-maximum",
        "gradient-overload",
      ]);
    });

    it("uses category names from definitions", () => {
      const result = aggregate([], DEFAULT_CONFIG);
      const names = result.categories.map((c) => c.name);
      expect(names).toContain("Typography & Color");
      expect(names).toContain("Spacing & Effects");
      expect(names).toContain("Content");
      expect(names).toContain("Structure");
    });
  });

  describe("uses attenuatedScore (not rawScore)", () => {
    it("aggregates using attenuatedScore for category power mean", () => {
      const signals: SignalResult[] = [
        {
          id: "font-crime",
          name: "Font Crime",
          category: "typography-color",
          score: 0.8,
          rawScore: 0.8,
          attenuatedScore: 0.4, // attenuated from 0.8 to 0.4
          status: "scored",
          confidence: "high",
          evidence: [],
        },
        {
          id: "purple-plague",
          name: "Purple Plague",
          category: "typography-color",
          score: 0.6,
          rawScore: 0.6,
          attenuatedScore: 0.3, // attenuated from 0.6 to 0.3
          status: "scored",
          confidence: "high",
          evidence: [],
        },
      ];

      const result = aggregate(signals, DEFAULT_CONFIG);
      const typoCat = result.categories.find(
        (c) => c.id === "typography-color",
      )!;

      // Should use attenuatedScore: sqrt((0.16 + 0.09) / 2) = sqrt(0.125) ≈ 0.3536
      const expected = Math.sqrt((0.4 * 0.4 + 0.3 * 0.3) / 2);
      expect(typoCat.score).toBeCloseTo(expected, 4);

      // NOT using rawScore: sqrt((0.64 + 0.36) / 2) = sqrt(0.5) ≈ 0.7071
      const wrongExpected = Math.sqrt((0.8 * 0.8 + 0.6 * 0.6) / 2);
      expect(typoCat.score).not.toBeCloseTo(wrongExpected, 4);
    });
  });
});
