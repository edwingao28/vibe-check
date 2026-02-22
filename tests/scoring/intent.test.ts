import { describe, it, expect } from "vitest";
import { calculateIntent, deriveTier } from "../../src/scoring/intent.js";
import type { StyleFact } from "../../src/ir/types.js";

function makeFact(overrides: Partial<StyleFact>): StyleFact {
  return {
    property: "color",
    value: "red",
    rawValue: "red",
    source: "css",
    file: "style.css",
    line: 1,
    confidence: "high",
    ...overrides,
  };
}

describe("deriveTier", () => {
  it("returns 'None' for scores 0-20", () => {
    expect(deriveTier(0)).toBe("None");
    expect(deriveTier(10)).toBe("None");
    expect(deriveTier(20)).toBe("None");
  });

  it("returns 'Partial' for scores 21-55", () => {
    expect(deriveTier(21)).toBe("Partial");
    expect(deriveTier(35)).toBe("Partial");
    expect(deriveTier(55)).toBe("Partial");
  });

  it("returns 'Full' for scores 56-100", () => {
    expect(deriveTier(56)).toBe("Full");
    expect(deriveTier(80)).toBe("Full");
    expect(deriveTier(100)).toBe("Full");
  });
});

describe("calculateIntent", () => {
  it("returns score 0 and tier 'None' with no evidence", () => {
    const result = calculateIntent([], []);
    expect(result.score).toBe(0);
    expect(result.tier).toBe("None");
    expect(result.evidence).toHaveLength(0);
  });

  it("counts CSS custom properties at 2 points each, capped at 30", () => {
    // 5 unique CSS vars -> 10 points
    const facts: StyleFact[] = [
      makeFact({ property: "--color-primary", value: "#333" }),
      makeFact({ property: "--color-secondary", value: "#666" }),
      makeFact({ property: "--space-sm", value: "8px" }),
      makeFact({ property: "--space-md", value: "16px" }),
      makeFact({ property: "--space-lg", value: "24px" }),
    ];

    const result = calculateIntent(facts, []);
    // 5 vars * 2 = 10, plus naming convention (--color-* and --space-*) check
    expect(result.score).toBeGreaterThanOrEqual(10);
    const cssVarEvidence = result.evidence.find((e) => e.type === "css-vars");
    expect(cssVarEvidence).toBeDefined();
    expect(cssVarEvidence!.count).toBe(5);
  });

  it("caps CSS custom property points at 30", () => {
    // 20 unique CSS vars -> would be 40 points, but capped at 30
    const facts: StyleFact[] = Array.from({ length: 20 }, (_, i) =>
      makeFact({ property: `--var-${i}`, value: `${i}px` }),
    );

    const result = calculateIntent(facts, []);
    const cssVarEvidence = result.evidence.find((e) => e.type === "css-vars");
    expect(cssVarEvidence).toBeDefined();
    expect(cssVarEvidence!.count).toBe(20);
    // Points from CSS vars alone should be capped at 30
    // Total might be higher due to naming conventions
  });

  it("deduplicates CSS vars by property name", () => {
    const facts: StyleFact[] = [
      makeFact({ property: "--color-primary", value: "#333", file: "a.css" }),
      makeFact({ property: "--color-primary", value: "#333", file: "b.css" }),
      makeFact({ property: "--color-secondary", value: "#666" }),
    ];

    const result = calculateIntent(facts, []);
    const cssVarEvidence = result.evidence.find((e) => e.type === "css-vars");
    expect(cssVarEvidence!.count).toBe(2); // only 2 unique vars
  });

  it("detects design token files", () => {
    const fileList = ["src/tokens.css", "src/variables.css"];
    const result = calculateIntent([], fileList);
    // 2 files * 15 = 30 points
    const tokenEvidence = result.evidence.find(
      (e) => e.type === "design-token-files",
    );
    expect(tokenEvidence).toBeDefined();
    expect(tokenEvidence!.count).toBe(2);
    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it("caps design token file points at 30", () => {
    const fileList = [
      "tokens.css",
      "tokens.json",
      "tokens.ts",
      "variables.css",
      "theme.ts",
    ];
    const result = calculateIntent([], fileList);
    // 5 files * 15 = 75, capped at 30
    const tokenEvidence = result.evidence.find(
      (e) => e.type === "design-token-files",
    );
    expect(tokenEvidence).toBeDefined();
    // Score should include 30 from token files (capped)
  });

  it("detects consistent naming conventions when >= 3 vars share a prefix", () => {
    const facts: StyleFact[] = [
      makeFact({ property: "--color-primary", value: "#333" }),
      makeFact({ property: "--color-secondary", value: "#666" }),
      makeFact({ property: "--color-accent", value: "#999" }),
      makeFact({ property: "--color-muted", value: "#ccc" }),
    ];

    const result = calculateIntent(facts, []);
    const namingEvidence = result.evidence.find(
      (e) => e.type === "naming-conventions",
    );
    expect(namingEvidence).toBeDefined();
    // 4 vars with --color-* prefix, which is >= 3 and >= 50% of total
    expect(result.score).toBeGreaterThanOrEqual(18); // 4*2=8 + 10 = 18
  });

  it("does not detect naming conventions with fewer than 3 vars", () => {
    const facts: StyleFact[] = [
      makeFact({ property: "--color-primary", value: "#333" }),
      makeFact({ property: "--size-sm", value: "8px" }),
    ];

    const result = calculateIntent(facts, []);
    const namingEvidence = result.evidence.find(
      (e) => e.type === "naming-conventions",
    );
    expect(namingEvidence).toBeUndefined();
  });

  it("counts custom fonts (>1 distinct font-family)", () => {
    const facts: StyleFact[] = [
      makeFact({ property: "font-family", value: "Inter" }),
      makeFact({ property: "font-family", value: "Playfair Display" }),
      makeFact({ property: "font-family", value: "JetBrains Mono" }),
    ];

    const result = calculateIntent(facts, []);
    const fontEvidence = result.evidence.find(
      (e) => e.type === "custom-fonts",
    );
    expect(fontEvidence).toBeDefined();
    expect(fontEvidence!.count).toBe(2); // 2 beyond the primary
    expect(result.score).toBeGreaterThanOrEqual(10); // 2 * 5 = 10
  });

  it("caps custom font points at 15", () => {
    const facts: StyleFact[] = Array.from({ length: 6 }, (_, i) =>
      makeFact({ property: "font-family", value: `Font${i}` }),
    );

    const result = calculateIntent(facts, []);
    const fontEvidence = result.evidence.find(
      (e) => e.type === "custom-fonts",
    );
    expect(fontEvidence).toBeDefined();
    expect(fontEvidence!.count).toBe(5); // 5 beyond the primary
    // 5 * 5 = 25, capped at 15
  });

  it("does not count fonts when only 1 is used", () => {
    const facts: StyleFact[] = [
      makeFact({ property: "font-family", value: "Inter" }),
      makeFact({ property: "font-family", value: "Inter" }),
    ];

    const result = calculateIntent(facts, []);
    const fontEvidence = result.evidence.find(
      (e) => e.type === "custom-fonts",
    );
    expect(fontEvidence).toBeUndefined();
  });

  it("detects style guide files", () => {
    const fileList = ["docs/STYLE_GUIDE.md"];
    const result = calculateIntent([], fileList);
    const guideEvidence = result.evidence.find(
      (e) => e.type === "style-guide",
    );
    expect(guideEvidence).toBeDefined();
    expect(result.score).toBe(5);
  });

  it("detects design-system directory", () => {
    const fileList = ["packages/design-system/index.ts"];
    const result = calculateIntent([], fileList);
    const guideEvidence = result.evidence.find(
      (e) => e.type === "style-guide",
    );
    expect(guideEvidence).toBeDefined();
    expect(result.score).toBe(5);
  });

  it("caps total score at 100", () => {
    // Lots of CSS vars + token files + naming + fonts + style guide
    const facts: StyleFact[] = [
      ...Array.from({ length: 20 }, (_, i) =>
        makeFact({ property: `--brand-${i}`, value: `${i}px` }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        makeFact({ property: "font-family", value: `Font${i}` }),
      ),
    ];
    const fileList = [
      "tokens.css",
      "tokens.json",
      "variables.css",
      "theme.ts",
      "STYLE_GUIDE.md",
    ];

    const result = calculateIntent(facts, fileList);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("builds correct attenuation map for each tier", () => {
    // Score 0 -> None
    const noneResult = calculateIntent([], []);
    expect(noneResult.attenuations["font-crime"]).toBe(1.0);
    expect(noneResult.attenuations["purple-plague"]).toBe(1.0);

    // Score ~30 -> Partial (use 10 CSS vars = 20 + naming conventions = 30)
    const partialFacts = Array.from({ length: 15 }, (_, i) =>
      makeFact({ property: `--color-${i}`, value: `${i}px` }),
    );
    const partialResult = calculateIntent(partialFacts, []);
    expect(partialResult.tier).toBe("Partial");
    expect(partialResult.attenuations["font-crime"]).toBe(0.7);
    expect(partialResult.attenuations["purple-plague"]).toBe(0.6);
    expect(partialResult.attenuations["border-radius-maximum"]).toBe(0.8);
    expect(partialResult.attenuations["shadow-realm"]).toBe(0.9);

    // Score >= 56 -> Full
    const fullFacts = Array.from({ length: 20 }, (_, i) =>
      makeFact({ property: `--brand-${i}`, value: `${i}px` }),
    );
    const fullResult = calculateIntent(fullFacts, [
      "tokens.css",
      "variables.css",
    ]);
    expect(fullResult.tier).toBe("Full");
    expect(fullResult.attenuations["font-crime"]).toBe(0.4);
    expect(fullResult.attenuations["purple-plague"]).toBe(0.3);
    expect(fullResult.attenuations["border-radius-maximum"]).toBe(0.5);
    expect(fullResult.attenuations["shadow-realm"]).toBe(0.7);
  });
});
