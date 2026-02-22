import { describe, it, expect } from "vitest";
import { purplePlague } from "../../src/signals/purple-plague.js";
import { makeContext, makeColor } from "./__helpers__/make-context.js";

describe("Purple Plague signal", () => {
  it("scores high (sloppy) when mostly purple chromatic colors", () => {
    // Create 10 colors: 8 purple, 2 blue (all chromatic)
    const colors = [
      // Purple range (260-310)
      makeColor({ hsl: [270, 50, 50], hex: "#8833cc", file: "a.tsx", line: 1 }),
      makeColor({ hsl: [280, 60, 40], hex: "#7722aa", file: "a.tsx", line: 2 }),
      makeColor({ hsl: [290, 70, 50], hex: "#9944cc", file: "b.tsx", line: 1 }),
      makeColor({ hsl: [275, 55, 45], hex: "#8830bb", file: "b.tsx", line: 2 }),
      makeColor({ hsl: [285, 65, 55], hex: "#aa55dd", file: "c.tsx", line: 1 }),
      makeColor({ hsl: [270, 50, 60], hex: "#9955cc", file: "c.tsx", line: 2 }),
      makeColor({ hsl: [300, 40, 50], hex: "#b344b3", file: "d.tsx", line: 1 }),
      makeColor({ hsl: [265, 60, 45], hex: "#7733bb", file: "d.tsx", line: 2 }),
      // Non-purple chromatic
      makeColor({ hsl: [200, 50, 50], hex: "#3388cc", file: "e.tsx", line: 1 }),
      makeColor({ hsl: [120, 50, 50], hex: "#33cc33", file: "e.tsx", line: 2 }),
    ];

    const ctx = makeContext({ colors });
    const result = purplePlague.analyze(ctx);

    expect(result.status).toBe("scored");
    expect(result.score).toBeGreaterThanOrEqual(0.6);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it("scores low (clean) when colors are varied and not purple-dominated", () => {
    const colors = [
      makeColor({ hsl: [0, 50, 50] }),    // Red
      makeColor({ hsl: [60, 50, 50] }),   // Yellow
      makeColor({ hsl: [120, 50, 50] }),  // Green
      makeColor({ hsl: [180, 50, 50] }),  // Cyan
      makeColor({ hsl: [200, 50, 50] }),  // Blue
      makeColor({ hsl: [30, 50, 50] }),   // Orange
      makeColor({ hsl: [280, 50, 50] }),  // Purple (1 of 7)
    ];

    const ctx = makeContext({ colors });
    const result = purplePlague.analyze(ctx);

    expect(result.status).toBe("scored");
    // Purple ratio is 1/7 ≈ 0.14, below threshold of 0.3
    expect(result.score).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(0.0);
    expect(result.score).toBeLessThanOrEqual(0.3);
  });

  it("scores 0 when fewer than 5 chromatic colors", () => {
    const colors = [
      makeColor({ hsl: [270, 50, 50] }),
      makeColor({ hsl: [280, 60, 40] }),
      makeColor({ hsl: [290, 70, 50] }),
    ];

    const ctx = makeContext({ colors });
    const result = purplePlague.analyze(ctx);

    expect(result.score).toBe(0);
  });

  it("scores 0 when all colors are gray (low saturation)", () => {
    const colors = [
      makeColor({ hsl: [0, 5, 50] }),
      makeColor({ hsl: [0, 3, 30] }),
      makeColor({ hsl: [0, 2, 70] }),
      makeColor({ hsl: [0, 8, 40] }),
      makeColor({ hsl: [0, 1, 90] }),
    ];

    const ctx = makeContext({ colors });
    const result = purplePlague.analyze(ctx);

    expect(result.score).toBe(0);
  });

  it("scores 0 with empty colors", () => {
    const ctx = makeContext({ colors: [] });
    const result = purplePlague.analyze(ctx);
    expect(result.score).toBe(0);
  });

  it("ignores low-confidence colors", () => {
    const colors = [
      makeColor({ hsl: [270, 50, 50], confidence: "low" }),
      makeColor({ hsl: [280, 60, 40], confidence: "low" }),
      makeColor({ hsl: [290, 70, 50], confidence: "low" }),
      makeColor({ hsl: [275, 55, 45], confidence: "low" }),
      makeColor({ hsl: [285, 65, 55], confidence: "low" }),
    ];

    const ctx = makeContext({ colors });
    const result = purplePlague.analyze(ctx);

    // All filtered out due to low confidence
    expect(result.score).toBe(0);
  });

  it("accounts for token ratio reducing score", () => {
    // All colors are purple but many are from tokens
    const colors = [
      makeColor({ hsl: [270, 50, 50], token: "--brand-primary" }),
      makeColor({ hsl: [280, 60, 40], token: "--brand-secondary" }),
      makeColor({ hsl: [290, 70, 50], token: "--accent" }),
      makeColor({ hsl: [275, 55, 45], token: "--hover" }),
      makeColor({ hsl: [285, 65, 55], token: "--focus" }),
      makeColor({ hsl: [200, 50, 50] }),  // Non-purple, non-token
    ];

    const ctx = makeContext({ colors });
    const resultWithTokens = purplePlague.analyze(ctx);

    // Compare with same colors but no tokens
    const colorsNoTokens = colors.map((c) => ({ ...c, token: undefined }));
    const ctxNoTokens = makeContext({ colors: colorsNoTokens });
    const resultNoTokens = purplePlague.analyze(ctxNoTokens);

    // Token ratio should reduce the score
    expect(resultWithTokens.score).toBeLessThan(resultNoTokens.score);
  });

  it("provides evidence with purple count details", () => {
    const colors = [
      makeColor({ hsl: [270, 50, 50], file: "a.tsx", line: 5 }),
      makeColor({ hsl: [280, 60, 40], file: "b.tsx", line: 10 }),
      makeColor({ hsl: [290, 70, 50], file: "c.tsx", line: 15 }),
      makeColor({ hsl: [275, 55, 45], file: "d.tsx", line: 20 }),
      makeColor({ hsl: [285, 65, 55], file: "e.tsx", line: 25 }),
      makeColor({ hsl: [200, 50, 50], file: "f.tsx", line: 30 }),
    ];

    const ctx = makeContext({ colors });
    const result = purplePlague.analyze(ctx);

    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].summary).toContain("purple");
  });
});
