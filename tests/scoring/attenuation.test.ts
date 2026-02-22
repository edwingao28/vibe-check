import { describe, it, expect } from "vitest";
import { applyAttenuation } from "../../src/scoring/attenuation.js";
import type { SignalResult } from "../../src/signals/types.js";

function makeSignal(
  id: string,
  rawScore: number,
  overrides?: Partial<SignalResult>,
): SignalResult {
  return {
    id,
    name: id,
    category: "typography-color",
    score: rawScore,
    rawScore,
    attenuatedScore: rawScore,
    status: "scored",
    confidence: "high",
    evidence: [],
    ...overrides,
  };
}

describe("applyAttenuation", () => {
  describe("with intent tier 'None'", () => {
    it("does not attenuate any signals (all multipliers are 1.0)", () => {
      const signals = [
        makeSignal("font-crime", 0.8),
        makeSignal("purple-plague", 0.7),
        makeSignal("border-radius-maximum", 0.6),
        makeSignal("shadow-realm", 0.5),
        makeSignal("whitespace-wasteland", 0.9),
      ];

      const result = applyAttenuation(signals, "None");

      expect(result[0].attenuatedScore).toBeCloseTo(0.8);
      expect(result[1].attenuatedScore).toBeCloseTo(0.7);
      expect(result[2].attenuatedScore).toBeCloseTo(0.6);
      expect(result[3].attenuatedScore).toBeCloseTo(0.5);
      expect(result[4].attenuatedScore).toBeCloseTo(0.9);
    });
  });

  describe("with intent tier 'Partial'", () => {
    it("attenuates font-crime by 0.7", () => {
      const signals = [makeSignal("font-crime", 0.8)];
      const result = applyAttenuation(signals, "Partial");
      expect(result[0].attenuatedScore).toBeCloseTo(0.56); // 0.8 * 0.7
    });

    it("attenuates purple-plague by 0.6", () => {
      const signals = [makeSignal("purple-plague", 0.7)];
      const result = applyAttenuation(signals, "Partial");
      expect(result[0].attenuatedScore).toBeCloseTo(0.42); // 0.7 * 0.6
    });

    it("attenuates border-radius-maximum by 0.8", () => {
      const signals = [makeSignal("border-radius-maximum", 0.6)];
      const result = applyAttenuation(signals, "Partial");
      expect(result[0].attenuatedScore).toBeCloseTo(0.48); // 0.6 * 0.8
    });

    it("attenuates shadow-realm by 0.9", () => {
      const signals = [makeSignal("shadow-realm", 0.5)];
      const result = applyAttenuation(signals, "Partial");
      expect(result[0].attenuatedScore).toBeCloseTo(0.45); // 0.5 * 0.9
    });

    it("does not attenuate non-attenuatable signals", () => {
      const signals = [
        makeSignal("whitespace-wasteland", 0.9, {
          category: "spacing-effects",
        }),
        makeSignal("buzzword-bingo", 0.7, { category: "content" }),
        makeSignal("hero-syndrome", 0.6, { category: "content" }),
        makeSignal("cookie-cutter-layout", 0.5, { category: "structure" }),
        makeSignal("cta-mania", 0.4, { category: "structure" }),
        makeSignal("gradient-overload", 0.3, { category: "spacing-effects" }),
      ];

      const result = applyAttenuation(signals, "Partial");

      for (const signal of result) {
        expect(signal.attenuatedScore).toBe(signal.rawScore);
      }
    });
  });

  describe("with intent tier 'Full'", () => {
    it("attenuates font-crime by 0.4", () => {
      const signals = [makeSignal("font-crime", 1.0)];
      const result = applyAttenuation(signals, "Full");
      expect(result[0].attenuatedScore).toBeCloseTo(0.4); // 1.0 * 0.4
    });

    it("attenuates purple-plague by 0.3", () => {
      const signals = [makeSignal("purple-plague", 1.0)];
      const result = applyAttenuation(signals, "Full");
      expect(result[0].attenuatedScore).toBeCloseTo(0.3); // 1.0 * 0.3
    });

    it("attenuates border-radius-maximum by 0.5", () => {
      const signals = [makeSignal("border-radius-maximum", 1.0)];
      const result = applyAttenuation(signals, "Full");
      expect(result[0].attenuatedScore).toBeCloseTo(0.5); // 1.0 * 0.5
    });

    it("attenuates shadow-realm by 0.7", () => {
      const signals = [makeSignal("shadow-realm", 1.0)];
      const result = applyAttenuation(signals, "Full");
      expect(result[0].attenuatedScore).toBeCloseTo(0.7); // 1.0 * 0.7
    });
  });

  it("does not mutate the original signal array", () => {
    const original = makeSignal("font-crime", 0.8);
    const signals = [original];
    const result = applyAttenuation(signals, "Full");

    // Original should be unchanged
    expect(signals[0].attenuatedScore).toBe(0.8);
    // Result should have the new value
    expect(result[0].attenuatedScore).toBeCloseTo(0.32); // 0.8 * 0.4
    // They should be different objects
    expect(result[0]).not.toBe(original);
  });

  it("handles empty signal array", () => {
    const result = applyAttenuation([], "Partial");
    expect(result).toEqual([]);
  });

  it("preserves all other signal fields", () => {
    const signal = makeSignal("font-crime", 0.8, {
      name: "Font Crime",
      category: "typography-color",
      status: "scored",
      confidence: "high",
      evidence: [{ summary: "test", files: ["a.css"] }],
    });

    const result = applyAttenuation([signal], "Partial");

    expect(result[0].id).toBe("font-crime");
    expect(result[0].name).toBe("Font Crime");
    expect(result[0].category).toBe("typography-color");
    expect(result[0].status).toBe("scored");
    expect(result[0].confidence).toBe("high");
    expect(result[0].evidence).toEqual([{ summary: "test", files: ["a.css"] }]);
    expect(result[0].rawScore).toBe(0.8);
  });
});
