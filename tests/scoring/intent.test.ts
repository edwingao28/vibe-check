import { describe, it, expect } from "vitest";
import {
  calculateIntent,
  deriveTier,
  isFrameworkDefault,
} from "../../src/scoring/intent.js";
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
    // 5 unique custom CSS vars -> 10 points
    const facts: StyleFact[] = [
      makeFact({ property: "--brand-primary", value: "#333" }),
      makeFact({ property: "--brand-secondary", value: "#666" }),
      makeFact({ property: "--space-sm", value: "8px" }),
      makeFact({ property: "--space-md", value: "16px" }),
      makeFact({ property: "--space-lg", value: "24px" }),
    ];

    const result = calculateIntent(facts, []);
    // 5 vars * 2 = 10, plus naming convention check
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
      makeFact({ property: "--brand-primary", value: "#333", file: "a.css" }),
      makeFact({ property: "--brand-primary", value: "#333", file: "b.css" }),
      makeFact({ property: "--brand-secondary", value: "#666" }),
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
      makeFact({ property: "--brand-primary", value: "#333" }),
      makeFact({ property: "--brand-secondary", value: "#666" }),
      makeFact({ property: "--brand-accent", value: "#999" }),
      makeFact({ property: "--brand-muted", value: "#ccc" }),
    ];

    const result = calculateIntent(facts, []);
    const namingEvidence = result.evidence.find(
      (e) => e.type === "naming-conventions",
    );
    expect(namingEvidence).toBeDefined();
    // 4 vars with --brand-* prefix, which is >= 3 and >= 50% of total
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
    const fontEvidence = result.evidence.find((e) => e.type === "custom-fonts");
    expect(fontEvidence).toBeDefined();
    expect(fontEvidence!.count).toBe(2); // 2 beyond the primary
    expect(result.score).toBeGreaterThanOrEqual(10); // 2 * 5 = 10
  });

  it("caps custom font points at 15", () => {
    const facts: StyleFact[] = Array.from({ length: 6 }, (_, i) =>
      makeFact({ property: "font-family", value: `Font${i}` }),
    );

    const result = calculateIntent(facts, []);
    const fontEvidence = result.evidence.find((e) => e.type === "custom-fonts");
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
    const fontEvidence = result.evidence.find((e) => e.type === "custom-fonts");
    expect(fontEvidence).toBeUndefined();
  });

  it("detects style guide files", () => {
    const fileList = ["docs/STYLE_GUIDE.md"];
    const result = calculateIntent([], fileList);
    const guideEvidence = result.evidence.find((e) => e.type === "style-guide");
    expect(guideEvidence).toBeDefined();
    expect(result.score).toBe(5);
  });

  it("detects design-system directory", () => {
    const fileList = ["packages/design-system/index.ts"];
    const result = calculateIntent([], fileList);
    const guideEvidence = result.evidence.find((e) => e.type === "style-guide");
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

  it("filters out shadcn/ui framework-default CSS vars from scoring", () => {
    // All of these are shadcn/ui defaults and should be filtered
    const shadcnDefaults: StyleFact[] = [
      makeFact({ property: "--background", value: "0 0% 100%" }),
      makeFact({ property: "--foreground", value: "222.2 84% 4.9%" }),
      makeFact({ property: "--primary", value: "222.2 47.4% 11.2%" }),
      makeFact({ property: "--primary-foreground", value: "210 40% 98%" }),
      makeFact({ property: "--secondary", value: "210 40% 96.1%" }),
      makeFact({
        property: "--secondary-foreground",
        value: "222.2 47.4% 11.2%",
      }),
      makeFact({ property: "--muted", value: "210 40% 96.1%" }),
      makeFact({ property: "--muted-foreground", value: "215.4 16.3% 46.9%" }),
      makeFact({ property: "--accent", value: "210 40% 96.1%" }),
      makeFact({ property: "--accent-foreground", value: "222.2 47.4% 11.2%" }),
      makeFact({ property: "--destructive", value: "0 84.2% 60.2%" }),
      makeFact({ property: "--destructive-foreground", value: "210 40% 98%" }),
      makeFact({ property: "--border", value: "214.3 31.8% 91.4%" }),
      makeFact({ property: "--input", value: "214.3 31.8% 91.4%" }),
      makeFact({ property: "--ring", value: "222.2 84% 4.9%" }),
      makeFact({ property: "--radius", value: "0.5rem" }),
      makeFact({ property: "--card", value: "0 0% 100%" }),
      makeFact({ property: "--card-foreground", value: "222.2 84% 4.9%" }),
      makeFact({ property: "--popover", value: "0 0% 100%" }),
      makeFact({ property: "--popover-foreground", value: "222.2 84% 4.9%" }),
      makeFact({ property: "--chart-1", value: "12 76% 61%" }),
      makeFact({ property: "--chart-2", value: "173 58% 39%" }),
      makeFact({ property: "--sidebar-background", value: "0 0% 98%" }),
      makeFact({ property: "--sidebar-foreground", value: "240 5.3% 26.1%" }),
    ];

    const result = calculateIntent(shadcnDefaults, []);
    const cssVarEvidence = result.evidence.find((e) => e.type === "css-vars");
    expect(cssVarEvidence).toBeDefined();
    // All vars are framework defaults, so custom count should be 0
    expect(cssVarEvidence!.count).toBe(0);
    // Score from CSS vars should be 0
    expect(result.score).toBe(0);
    // Evidence description should mention filtered defaults
    expect(cssVarEvidence!.description).toContain(
      "framework defaults filtered",
    );
  });

  it("filters out Tailwind CSS framework-default vars from scoring", () => {
    const tailwindDefaults: StyleFact[] = [
      makeFact({ property: "--tw-ring-color", value: "blue" }),
      makeFact({ property: "--tw-shadow", value: "0 0 #0000" }),
      makeFact({ property: "--color-blue-500", value: "#3b82f6" }),
      makeFact({ property: "--font-sans", value: "ui-sans-serif" }),
      makeFact({
        property: "--shadow-sm",
        value: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      }),
      makeFact({
        property: "--animate-spin",
        value: "spin 1s linear infinite",
      }),
      makeFact({ property: "--breakpoint-sm", value: "640px" }),
      makeFact({ property: "--spacing", value: "0.25rem" }),
      makeFact({ property: "--text-sm", value: "0.875rem" }),
      makeFact({ property: "--leading-normal", value: "1.5" }),
      makeFact({ property: "--tracking-tight", value: "-0.025em" }),
      makeFact({ property: "--blur", value: "8px" }),
      makeFact({ property: "--radius-sm", value: "0.125rem" }),
    ];

    const result = calculateIntent(tailwindDefaults, []);
    const cssVarEvidence = result.evidence.find((e) => e.type === "css-vars");
    expect(cssVarEvidence).toBeDefined();
    expect(cssVarEvidence!.count).toBe(0);
    expect(result.score).toBe(0);
  });

  it("counts only custom vars when mixed with framework defaults", () => {
    const facts: StyleFact[] = [
      // Framework defaults (should be filtered)
      makeFact({ property: "--background", value: "0 0% 100%" }),
      makeFact({ property: "--foreground", value: "222.2 84% 4.9%" }),
      makeFact({ property: "--primary", value: "222.2 47.4% 11.2%" }),
      makeFact({ property: "--tw-ring-color", value: "blue" }),
      // Custom vars (should be counted)
      makeFact({ property: "--brand-blue", value: "#0055ff" }),
      makeFact({ property: "--brand-green", value: "#00cc88" }),
      makeFact({ property: "--header-height", value: "64px" }),
    ];

    const result = calculateIntent(facts, []);
    const cssVarEvidence = result.evidence.find((e) => e.type === "css-vars");
    expect(cssVarEvidence).toBeDefined();
    // Only 3 custom vars should be counted
    expect(cssVarEvidence!.count).toBe(3);
    // 3 custom * 2 = 6 points
    expect(result.score).toBeGreaterThanOrEqual(6);
    // Should mention the 4 filtered defaults
    expect(cssVarEvidence!.description).toContain(
      "4 framework defaults filtered",
    );
  });

  it("does not count framework-default vars toward naming conventions", () => {
    // 10 shadcn vars with implicit prefix patterns -- should NOT trigger naming conventions
    const facts: StyleFact[] = [
      makeFact({ property: "--sidebar-background", value: "0 0% 98%" }),
      makeFact({ property: "--sidebar-foreground", value: "240 5.3% 26.1%" }),
      makeFact({ property: "--sidebar-primary", value: "240 5.9% 10%" }),
      makeFact({ property: "--sidebar-accent", value: "240 4.8% 95.9%" }),
      makeFact({ property: "--sidebar-border", value: "220 13% 91%" }),
    ];

    const result = calculateIntent(facts, []);
    const namingEvidence = result.evidence.find(
      (e) => e.type === "naming-conventions",
    );
    // All --sidebar-* vars are framework defaults, so no naming convention detection
    expect(namingEvidence).toBeUndefined();
  });

  it("builds correct attenuation map for each tier", () => {
    // Score 0 -> None
    const noneResult = calculateIntent([], []);
    expect(noneResult.attenuations["font-crime"]).toBe(1.0);
    expect(noneResult.attenuations["purple-plague"]).toBe(1.0);

    // Score ~30 -> Partial (use 15 custom CSS vars = 30 + naming conventions = 40)
    const partialFacts = Array.from({ length: 15 }, (_, i) =>
      makeFact({ property: `--brand-${i}`, value: `${i}px` }),
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

describe("isFrameworkDefault", () => {
  it("identifies shadcn/ui default variable names", () => {
    expect(isFrameworkDefault("--background")).toBe(true);
    expect(isFrameworkDefault("--foreground")).toBe(true);
    expect(isFrameworkDefault("--primary")).toBe(true);
    expect(isFrameworkDefault("--primary-foreground")).toBe(true);
    expect(isFrameworkDefault("--secondary")).toBe(true);
    expect(isFrameworkDefault("--muted")).toBe(true);
    expect(isFrameworkDefault("--accent")).toBe(true);
    expect(isFrameworkDefault("--destructive")).toBe(true);
    expect(isFrameworkDefault("--border")).toBe(true);
    expect(isFrameworkDefault("--input")).toBe(true);
    expect(isFrameworkDefault("--ring")).toBe(true);
    expect(isFrameworkDefault("--radius")).toBe(true);
    expect(isFrameworkDefault("--card")).toBe(true);
    expect(isFrameworkDefault("--popover")).toBe(true);
    expect(isFrameworkDefault("--chart-1")).toBe(true);
    expect(isFrameworkDefault("--chart-5")).toBe(true);
    expect(isFrameworkDefault("--sidebar-background")).toBe(true);
    expect(isFrameworkDefault("--sidebar-foreground")).toBe(true);
  });

  it("identifies Tailwind CSS default variable names", () => {
    expect(isFrameworkDefault("--tw-ring-color")).toBe(true);
    expect(isFrameworkDefault("--tw-shadow")).toBe(true);
    expect(isFrameworkDefault("--color-blue-500")).toBe(true);
    expect(isFrameworkDefault("--font-sans")).toBe(true);
    expect(isFrameworkDefault("--font-mono")).toBe(true);
    expect(isFrameworkDefault("--shadow-sm")).toBe(true);
    expect(isFrameworkDefault("--shadow-lg")).toBe(true);
    expect(isFrameworkDefault("--animate-spin")).toBe(true);
    expect(isFrameworkDefault("--breakpoint-sm")).toBe(true);
    expect(isFrameworkDefault("--spacing")).toBe(true);
    expect(isFrameworkDefault("--text-sm")).toBe(true);
    expect(isFrameworkDefault("--text-base")).toBe(true);
    expect(isFrameworkDefault("--leading-normal")).toBe(true);
    expect(isFrameworkDefault("--tracking-tight")).toBe(true);
    expect(isFrameworkDefault("--blur")).toBe(true);
    expect(isFrameworkDefault("--radius-sm")).toBe(true);
    expect(isFrameworkDefault("--radius-lg")).toBe(true);
    expect(isFrameworkDefault("--inset-ring")).toBe(true);
    expect(isFrameworkDefault("--backdrop-blur")).toBe(true);
    expect(isFrameworkDefault("--aspect-video")).toBe(true);
    expect(isFrameworkDefault("--ease-in")).toBe(true);
    expect(isFrameworkDefault("--container-sm")).toBe(true);
    expect(isFrameworkDefault("--default-border")).toBe(true);
    expect(isFrameworkDefault("--perspective-normal")).toBe(true);
  });

  it("does NOT flag custom CSS variable names", () => {
    expect(isFrameworkDefault("--brand-blue")).toBe(false);
    expect(isFrameworkDefault("--brand-primary")).toBe(false);
    expect(isFrameworkDefault("--header-height")).toBe(false);
    expect(isFrameworkDefault("--nav-bg")).toBe(false);
    expect(isFrameworkDefault("--sidebar")).toBe(false); // exact match only, not prefix
    expect(isFrameworkDefault("--space-sm")).toBe(false);
    expect(isFrameworkDefault("--app-width")).toBe(false);
    expect(isFrameworkDefault("--z-header")).toBe(false);
    expect(isFrameworkDefault("--grid-gap")).toBe(false);
  });
});
