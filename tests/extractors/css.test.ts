import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { parseCssFile, extractCss } from "../../src/extractors/css.js";
import { readFileSync } from "node:fs";

const FIXTURES = join(import.meta.dirname, "__fixtures__");

describe("parseCssFile", () => {
  it("extracts font-family declarations from basic.css", () => {
    const content = readFileSync(join(FIXTURES, "basic.css"), "utf-8");
    const result = parseCssFile(content, "basic.css");

    const fontFacts = result.facts.filter((f) => f.property === "font-family");
    expect(fontFacts.length).toBeGreaterThanOrEqual(2);
    expect(fontFacts.some((f) => f.value.includes("Inter"))).toBe(true);
    expect(fontFacts.some((f) => f.value.includes("Playfair Display"))).toBe(true);
  });

  it("extracts spacing (padding/margin/gap) facts from basic.css", () => {
    const content = readFileSync(join(FIXTURES, "basic.css"), "utf-8");
    const result = parseCssFile(content, "basic.css");

    const spacingProps = ["padding", "margin", "gap", "margin-top"];
    const spacingFacts = result.facts.filter((f) => spacingProps.includes(f.property));
    expect(spacingFacts.length).toBeGreaterThanOrEqual(4);
  });

  it("extracts box-shadow facts from basic.css", () => {
    const content = readFileSync(join(FIXTURES, "basic.css"), "utf-8");
    const result = parseCssFile(content, "basic.css");

    const shadowFacts = result.facts.filter((f) => f.property === "box-shadow");
    expect(shadowFacts.length).toBeGreaterThanOrEqual(2);
  });

  it("extracts border-radius facts from basic.css", () => {
    const content = readFileSync(join(FIXTURES, "basic.css"), "utf-8");
    const result = parseCssFile(content, "basic.css");

    const radiusFacts = result.facts.filter((f) => f.property === "border-radius");
    expect(radiusFacts.length).toBeGreaterThanOrEqual(3);
  });

  it("extracts gradient background from basic.css", () => {
    const content = readFileSync(join(FIXTURES, "basic.css"), "utf-8");
    const result = parseCssFile(content, "basic.css");

    const gradientFacts = result.facts.filter(
      (f) => f.property === "background" && f.value.includes("gradient")
    );
    expect(gradientFacts.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts color facts from basic.css", () => {
    const content = readFileSync(join(FIXTURES, "basic.css"), "utf-8");
    const result = parseCssFile(content, "basic.css");

    // Should have multiple color facts
    expect(result.colors.length).toBeGreaterThanOrEqual(3);

    // Should have resolved hex colors
    const resolvedColors = result.colors.filter((c) => c.hex !== undefined);
    expect(resolvedColors.length).toBeGreaterThanOrEqual(3);

    // Should have HSL values
    const hslColors = result.colors.filter((c) => c.hsl !== undefined);
    expect(hslColors.length).toBeGreaterThanOrEqual(3);
  });

  it("extracts colors from gradient stops", () => {
    const content = readFileSync(join(FIXTURES, "basic.css"), "utf-8");
    const result = parseCssFile(content, "basic.css");

    // The gradient in basic.css has two hex colors
    const gradientColors = result.colors.filter(
      (c) => c.hex === "#7c3aed" || c.hex === "#4f46e5"
    );
    expect(gradientColors.length).toBeGreaterThanOrEqual(2);
  });

  it("sets source type to css", () => {
    const content = readFileSync(join(FIXTURES, "basic.css"), "utf-8");
    const result = parseCssFile(content, "basic.css");

    for (const fact of result.facts) {
      expect(fact.source).toBe("css");
    }
    for (const color of result.colors) {
      expect(color.source).toBe("css");
    }
  });

  it("has high confidence for resolved values", () => {
    const content = readFileSync(join(FIXTURES, "basic.css"), "utf-8");
    const result = parseCssFile(content, "basic.css");

    for (const fact of result.facts) {
      expect(fact.confidence).toBe("high");
    }
  });
});

describe("parseCssFile with CSS custom properties", () => {
  it("extracts custom property declarations from with-vars.css", () => {
    const content = readFileSync(join(FIXTURES, "with-vars.css"), "utf-8");
    const result = parseCssFile(content, "with-vars.css");

    const customProps = result.facts.filter((f) => f.property.startsWith("--"));
    expect(customProps.length).toBeGreaterThanOrEqual(7);

    // Check specific custom properties
    expect(customProps.some((f) => f.property === "--color-primary")).toBe(true);
    expect(customProps.some((f) => f.property === "--space-md")).toBe(true);
    expect(customProps.some((f) => f.property === "--radius-default")).toBe(true);
  });

  it("extracts color values from custom property declarations", () => {
    const content = readFileSync(join(FIXTURES, "with-vars.css"), "utf-8");
    const result = parseCssFile(content, "with-vars.css");

    // Color custom properties should create ColorFacts
    const colorFactsWithToken = result.colors.filter((c) => c.token !== undefined);
    expect(colorFactsWithToken.length).toBeGreaterThanOrEqual(2);
  });

  it("tags var() references as low confidence", () => {
    const content = readFileSync(join(FIXTURES, "with-vars.css"), "utf-8");
    const result = parseCssFile(content, "with-vars.css");

    // color: var(--color-text) should create a low-confidence color fact
    const lowConfidence = result.colors.filter((c) => c.confidence === "low");
    expect(lowConfidence.length).toBeGreaterThanOrEqual(1);
  });
});

describe("parseCssFile with suppressions", () => {
  it("extracts suppression comments from with-suppression.css", () => {
    const content = readFileSync(join(FIXTURES, "with-suppression.css"), "utf-8");
    const result = parseCssFile(content, "with-suppression.css");

    expect(result.suppressions.length).toBeGreaterThanOrEqual(3);

    // Check specific suppressions
    const shadowSuppression = result.suppressions.find((s) =>
      s.signals.includes("shadow-realm")
    );
    expect(shadowSuppression).toBeDefined();

    const multiSuppression = result.suppressions.find(
      (s) => s.signals.includes("gradient-overload") && s.signals.includes("purple-plague")
    );
    expect(multiSuppression).toBeDefined();

    const fontSuppression = result.suppressions.find((s) =>
      s.signals.includes("font-crime")
    );
    expect(fontSuppression).toBeDefined();
  });
});

describe("extractCss", () => {
  it("processes multiple CSS files and reports health", () => {
    const files = [
      join(FIXTURES, "basic.css"),
      join(FIXTURES, "with-vars.css"),
      join(FIXTURES, "with-suppression.css"),
    ];

    const result = extractCss(files);
    expect(result.name).toBe("css");
    expect(result.status).toBe("healthy");
    expect(result.filesAttempted).toBe(3);
    expect(result.filesParsed).toBe(3);
    expect(result.coverage).toBe(1);
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.colors.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it("reports healthy status for empty file list", () => {
    const result = extractCss([]);
    expect(result.status).toBe("healthy");
    expect(result.coverage).toBe(1);
  });

  it("handles non-existent files gracefully", () => {
    const files = [
      join(FIXTURES, "basic.css"),
      join(FIXTURES, "nonexistent.css"),
    ];

    const result = extractCss(files);
    expect(result.filesAttempted).toBe(2);
    expect(result.filesParsed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.status).toBe("degraded");
  });

  it("respects custom source type", () => {
    const result = extractCss([join(FIXTURES, "basic.css")], "css-module");
    expect(result.name).toBe("css-module");
    for (const fact of result.facts) {
      expect(fact.source).toBe("css-module");
    }
  });
});
