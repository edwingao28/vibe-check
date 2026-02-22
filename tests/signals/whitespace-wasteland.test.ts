import { describe, it, expect } from "vitest";
import { whitespaceWasteland } from "../../src/signals/whitespace-wasteland.js";
import { makeContext, makeFact } from "./__helpers__/make-context.js";

describe("Whitespace Wasteland signal", () => {
  it("scores high (sloppy) with monotonous spacing", () => {
    // 95 of 100 declarations use the same value → very low entropy, very low unique ratio
    const facts = [];
    for (let i = 0; i < 95; i++) {
      facts.push(makeFact({ property: "padding", value: "16px", file: `comp${i}.tsx`, line: 1 }));
    }
    // A few other values to keep it realistic
    for (let i = 0; i < 5; i++) {
      facts.push(makeFact({ property: "margin", value: "32px", file: `comp${i}.tsx`, line: 2 }));
    }

    const ctx = makeContext({ facts });
    const result = whitespaceWasteland.analyze(ctx);

    expect(result.status).toBe("scored");
    // 95/100 dominant → entropy ≈ 0.286, normalized ≈ 0.286, uniqueRatio = 2/100 = 0.02
    // Score = 1 - (0.286*0.6 + 0.02*0.4) ≈ 1 - 0.18 ≈ 0.82
    expect(result.score).toBeGreaterThanOrEqual(0.6);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it("scores low (clean) with varied spacing", () => {
    const spacingValues = [
      "4px", "8px", "12px", "16px", "20px", "24px", "32px", "40px",
      "48px", "64px", "80px", "96px", "128px",
    ];
    const facts = spacingValues.map((v, i) =>
      makeFact({ property: "padding", value: v, file: `comp${i}.tsx`, line: 1 })
    );
    // Add some margin variety too
    for (const v of spacingValues.slice(0, 8)) {
      facts.push(makeFact({ property: "margin", value: v, file: "other.tsx", line: 1 }));
    }

    const ctx = makeContext({ facts });
    const result = whitespaceWasteland.analyze(ctx);

    expect(result.status).toBe("scored");
    expect(result.score).toBeGreaterThanOrEqual(0.0);
    expect(result.score).toBeLessThanOrEqual(0.3);
  });

  it("scores 0 with empty facts", () => {
    const ctx = makeContext({ facts: [] });
    const result = whitespaceWasteland.analyze(ctx);
    expect(result.score).toBe(0);
  });

  it("scores 0 with no spacing-related facts", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "font-family", value: "Inter" }),
        makeFact({ property: "color", value: "red" }),
      ],
    });
    const result = whitespaceWasteland.analyze(ctx);
    expect(result.score).toBe(0);
  });

  it("handles single spacing value correctly", () => {
    // Only one unique value used everywhere
    const facts = Array.from({ length: 20 }, (_, i) =>
      makeFact({ property: "padding", value: "16px", file: `f${i}.tsx`, line: 1 })
    );

    const ctx = makeContext({ facts });
    const result = whitespaceWasteland.analyze(ctx);

    // Single value → entropy=0, uniqueRatio=1/20=0.05
    // Score = 1 - (0*0.6 + 0.05*0.4) = 1 - 0.02 = 0.98
    expect(result.score).toBeGreaterThanOrEqual(0.9);
  });

  it("recognizes various spacing property names", () => {
    const props = ["margin", "margin-top", "padding-left", "gap", "row-gap", "column-gap"];
    const facts = props.map((p, i) =>
      makeFact({ property: p, value: "16px", file: `f${i}.tsx`, line: 1 })
    );

    const ctx = makeContext({ facts });
    const result = whitespaceWasteland.analyze(ctx);

    // All same value, should score high
    expect(result.score).toBeGreaterThanOrEqual(0.6);
  });

  it("provides evidence with entropy and unique count", () => {
    const facts = [
      makeFact({ property: "padding", value: "16px" }),
      makeFact({ property: "margin", value: "16px" }),
      makeFact({ property: "gap", value: "32px" }),
    ];

    const ctx = makeContext({ facts });
    const result = whitespaceWasteland.analyze(ctx);

    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].summary).toContain("entropy");
    expect(result.evidence[0].summary).toContain("unique");
  });
});
