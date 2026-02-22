import { describe, it, expect } from "vitest";
import { gradientOverload } from "../../src/signals/gradient-overload.js";
import { makeContext, makeFact } from "./__helpers__/make-context.js";

describe("Gradient Overload signal", () => {
  it("scores high (sloppy) with many gradients per file", () => {
    // 9 gradients across 3 files = avg 3/file → score 1.0
    const facts = [
      makeFact({ property: "background", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", file: "Hero.tsx", line: 1 }),
      makeFact({ property: "background", value: "linear-gradient(to right, #f093fb, #f5576c)", file: "Hero.tsx", line: 5 }),
      makeFact({ property: "background", value: "radial-gradient(circle, #667eea, transparent)", file: "Hero.tsx", line: 9 }),
      makeFact({ property: "background", value: "linear-gradient(180deg, #667eea 0%, #764ba2 100%)", file: "Card.tsx", line: 1 }),
      makeFact({ property: "background", value: "linear-gradient(90deg, #f093fb, #f5576c)", file: "Card.tsx", line: 5 }),
      makeFact({ property: "background", value: "linear-gradient(45deg, #667eea, #764ba2)", file: "Card.tsx", line: 9 }),
      makeFact({ property: "background-image", value: "linear-gradient(#e66465, #9198e5)", file: "CTA.tsx", line: 1 }),
      makeFact({ property: "background", value: "linear-gradient(to bottom, #f093fb, #f5576c)", file: "CTA.tsx", line: 5 }),
      makeFact({ property: "background", value: "conic-gradient(red, yellow, lime)", file: "CTA.tsx", line: 9 }),
    ];

    const ctx = makeContext({ facts });
    const result = gradientOverload.analyze(ctx);

    expect(result.status).toBe("scored");
    expect(result.score).toBeGreaterThanOrEqual(0.9);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it("scores moderate with some gradients", () => {
    // 3 gradients across 2 files = avg 1.5/file → score 0.5
    const facts = [
      makeFact({ property: "background", value: "linear-gradient(135deg, #667eea, #764ba2)", file: "Hero.tsx", line: 1 }),
      makeFact({ property: "background", value: "linear-gradient(to right, #f093fb, #f5576c)", file: "Hero.tsx", line: 5 }),
      makeFact({ property: "background", value: "radial-gradient(circle, #667eea, transparent)", file: "Card.tsx", line: 1 }),
    ];

    const ctx = makeContext({ facts });
    const result = gradientOverload.analyze(ctx);

    expect(result.score).toBeCloseTo(0.5, 1);
  });

  it("scores low (clean) with minimal gradients", () => {
    // 1 gradient in 3 files (other facts present) = avg 0.33/file → score ~0.11
    const facts = [
      makeFact({ property: "background", value: "linear-gradient(135deg, #667eea, #764ba2)", file: "Hero.tsx", line: 1 }),
      makeFact({ property: "padding", value: "16px", file: "Card.tsx", line: 1 }),
      makeFact({ property: "margin", value: "8px", file: "Layout.tsx", line: 1 }),
    ];

    const ctx = makeContext({ facts });
    const result = gradientOverload.analyze(ctx);

    // Only 1 gradient in 1 file → avg 1/1 = 1/3 → ~0.33
    expect(result.score).toBeCloseTo(1 / 3, 1);
  });

  it("scores 0 with no gradient facts", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "background", value: "#fff" }),
        makeFact({ property: "padding", value: "16px" }),
      ],
    });

    const result = gradientOverload.analyze(ctx);
    expect(result.score).toBe(0);
  });

  it("scores 0 with empty facts", () => {
    const ctx = makeContext({ facts: [] });
    const result = gradientOverload.analyze(ctx);
    expect(result.score).toBe(0);
  });

  it("detects various gradient types", () => {
    const facts = [
      makeFact({ property: "background", value: "linear-gradient(red, blue)", file: "a.tsx", line: 1 }),
      makeFact({ property: "background-image", value: "radial-gradient(circle, red, blue)", file: "a.tsx", line: 2 }),
      makeFact({ property: "background", value: "conic-gradient(red, yellow, lime)", file: "a.tsx", line: 3 }),
    ];

    const ctx = makeContext({ facts });
    const result = gradientOverload.analyze(ctx);

    // 3 gradients in 1 file → avg 3 → score 1.0
    expect(result.score).toBe(1.0);
  });

  it("provides evidence with gradient count and file count", () => {
    const facts = [
      makeFact({ property: "background", value: "linear-gradient(red, blue)", file: "Hero.tsx", line: 1 }),
      makeFact({ property: "background", value: "radial-gradient(circle, red, blue)", file: "Card.tsx", line: 1 }),
    ];

    const ctx = makeContext({ facts });
    const result = gradientOverload.analyze(ctx);

    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].summary).toContain("2");
    expect(result.evidence[0].summary).toContain("gradient");
  });
});
