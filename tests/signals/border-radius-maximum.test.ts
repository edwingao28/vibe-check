import { describe, it, expect } from "vitest";
import { borderRadiusMaximum } from "../../src/signals/border-radius-maximum.js";
import { makeContext, makeFact } from "./__helpers__/make-context.js";

describe("Border Radius Maximum signal", () => {
  it("scores high (sloppy) when one radius dominates", () => {
    // 8 out of 10 declarations use "0.5rem" = 80% → score = 0.8 - 0.3 = 0.5
    const facts = [];
    for (let i = 0; i < 8; i++) {
      facts.push(makeFact({ property: "border-radius", value: "0.5rem", file: `comp${i}.tsx`, line: 1 }));
    }
    facts.push(makeFact({ property: "border-radius", value: "0.25rem", file: "other1.tsx", line: 1 }));
    facts.push(makeFact({ property: "border-radius", value: "9999px", file: "other2.tsx", line: 1 }));

    const ctx = makeContext({ facts });
    const result = borderRadiusMaximum.analyze(ctx);

    expect(result.status).toBe("scored");
    // 80% most common → 0.8 - 0.3 = 0.5
    expect(result.score).toBeCloseTo(0.5, 1);
  });

  it("scores very high when 100% use same radius", () => {
    const facts = Array.from({ length: 20 }, (_, i) =>
      makeFact({ property: "border-radius", value: "0.5rem", file: `comp${i}.tsx`, line: 1 })
    );

    const ctx = makeContext({ facts });
    const result = borderRadiusMaximum.analyze(ctx);

    // 100% → 1.0 - 0.3 = 0.7
    expect(result.score).toBeCloseTo(0.7, 1);
    expect(result.score).toBeGreaterThanOrEqual(0.6);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it("scores low (clean) with varied radii", () => {
    const radii = ["0.125rem", "0.25rem", "0.375rem", "0.5rem", "0.75rem", "1rem", "9999px", "50%"];
    const facts = radii.map((v, i) =>
      makeFact({ property: "border-radius", value: v, file: `comp${i}.tsx`, line: 1 })
    );
    // Add a couple duplicates
    facts.push(makeFact({ property: "border-radius", value: "0.25rem", file: "extra1.tsx", line: 1 }));
    facts.push(makeFact({ property: "border-radius", value: "0.5rem", file: "extra2.tsx", line: 1 }));

    const ctx = makeContext({ facts });
    const result = borderRadiusMaximum.analyze(ctx);

    // Most common has 2/10 = 20% → 0.2 - 0.3 = -0.1 → clamped to 0
    expect(result.score).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(0.0);
    expect(result.score).toBeLessThanOrEqual(0.3);
  });

  it("scores 0 with no border-radius facts", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "padding", value: "16px" }),
        makeFact({ property: "margin", value: "8px" }),
      ],
    });

    const result = borderRadiusMaximum.analyze(ctx);
    expect(result.score).toBe(0);
  });

  it("scores 0 with empty facts", () => {
    const ctx = makeContext({ facts: [] });
    const result = borderRadiusMaximum.analyze(ctx);
    expect(result.score).toBe(0);
  });

  it("handles case-insensitive matching", () => {
    const facts = [
      makeFact({ property: "border-radius", value: "0.5REM" }),
      makeFact({ property: "border-radius", value: "0.5rem" }),
      makeFact({ property: "border-radius", value: "0.5Rem" }),
    ];

    const ctx = makeContext({ facts });
    const result = borderRadiusMaximum.analyze(ctx);

    // All normalize to same value → 100% → 0.7
    expect(result.score).toBeCloseTo(0.7, 1);
  });

  it("provides evidence with percentage and value", () => {
    const facts = [
      makeFact({ property: "border-radius", value: "0.5rem", file: "card.tsx", line: 5 }),
      makeFact({ property: "border-radius", value: "0.5rem", file: "button.tsx", line: 3 }),
      makeFact({ property: "border-radius", value: "0.25rem", file: "input.tsx", line: 7 }),
    ];

    const ctx = makeContext({ facts });
    const result = borderRadiusMaximum.analyze(ctx);

    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].summary).toContain("%");
    expect(result.evidence[0].summary).toContain("0.5rem");
  });
});
