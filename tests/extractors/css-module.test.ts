import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { extractCssModules } from "../../src/extractors/css-module.js";

const FIXTURES = join(import.meta.dirname, "__fixtures__");

describe("extractCssModules", () => {
  it("extracts facts from .module.css files", () => {
    const files = [join(FIXTURES, "module.module.css")];
    const result = extractCssModules(files);

    expect(result.name).toBe("css-module");
    expect(result.status).toBe("healthy");
    expect(result.filesAttempted).toBe(1);
    expect(result.filesParsed).toBe(1);
    expect(result.coverage).toBe(1);
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it("tags all facts with source: css-module", () => {
    const files = [join(FIXTURES, "module.module.css")];
    const result = extractCssModules(files);

    for (const fact of result.facts) {
      expect(fact.source).toBe("css-module");
    }
    for (const color of result.colors) {
      expect(color.source).toBe("css-module");
    }
  });

  it("detects component from .module.css filename", () => {
    const files = [join(FIXTURES, "module.module.css")];
    const result = extractCssModules(files);

    // Component should be derived from filename: "module" from "module.module.css"
    const factsWithComponent = result.facts.filter((f) => f.component === "module");
    expect(factsWithComponent.length).toBeGreaterThan(0);
  });

  it("extracts font-family declarations", () => {
    const files = [join(FIXTURES, "module.module.css")];
    const result = extractCssModules(files);

    const fontFacts = result.facts.filter((f) => f.property === "font-family");
    expect(fontFacts.length).toBeGreaterThanOrEqual(1);
    expect(fontFacts.some((f) => f.value.includes("Inter"))).toBe(true);
  });

  it("extracts color facts", () => {
    const files = [join(FIXTURES, "module.module.css")];
    const result = extractCssModules(files);

    expect(result.colors.length).toBeGreaterThanOrEqual(2);

    // Should have resolved hex colors
    const resolvedColors = result.colors.filter((c) => c.hex !== undefined);
    expect(resolvedColors.length).toBeGreaterThanOrEqual(2);
  });

  it("extracts border-radius facts", () => {
    const files = [join(FIXTURES, "module.module.css")];
    const result = extractCssModules(files);

    const radiusFacts = result.facts.filter((f) => f.property === "border-radius");
    expect(radiusFacts.length).toBeGreaterThanOrEqual(2);
  });

  it("extracts box-shadow facts", () => {
    const files = [join(FIXTURES, "module.module.css")];
    const result = extractCssModules(files);

    const shadowFacts = result.facts.filter((f) => f.property === "box-shadow");
    expect(shadowFacts.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts spacing (padding/margin) facts", () => {
    const files = [join(FIXTURES, "module.module.css")];
    const result = extractCssModules(files);

    const spacingFacts = result.facts.filter(
      (f) => f.property === "padding" || f.property === "margin"
    );
    expect(spacingFacts.length).toBeGreaterThanOrEqual(3);
  });

  it("reports healthy for empty file list", () => {
    const result = extractCssModules([]);
    expect(result.status).toBe("healthy");
    expect(result.coverage).toBe(1);
    expect(result.facts).toHaveLength(0);
  });

  it("handles non-existent files gracefully", () => {
    const files = [
      join(FIXTURES, "module.module.css"),
      join(FIXTURES, "nonexistent.module.css"),
    ];
    const result = extractCssModules(files);
    expect(result.filesAttempted).toBe(2);
    expect(result.filesParsed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.status).toBe("degraded");
  });
});
