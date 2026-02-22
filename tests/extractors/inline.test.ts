import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { parseInlineStyles, extractInlineStyles } from "../../src/extractors/inline.js";
import { readFileSync } from "node:fs";

const FIXTURES = join(import.meta.dirname, "__fixtures__");

describe("parseInlineStyles", () => {
  it("extracts static padding from style={{}} in inline-styles.tsx", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const paddingFacts = result.facts.filter(
      (f) => f.property === "padding" && f.confidence === "high"
    );
    expect(paddingFacts.length).toBeGreaterThanOrEqual(1);
    expect(paddingFacts.some((f) => f.value === "16px")).toBe(true);
  });

  it("extracts static margin from style={{}} ", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const marginFacts = result.facts.filter(
      (f) => f.property === "margin" && f.confidence === "high"
    );
    expect(marginFacts.length).toBeGreaterThanOrEqual(1);
    expect(marginFacts.some((f) => f.value === "8px")).toBe(true);
  });

  it("extracts backgroundColor as color fact", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const bgFacts = result.facts.filter(
      (f) => f.property === "background-color" && f.confidence === "high"
    );
    expect(bgFacts.length).toBeGreaterThanOrEqual(1);

    // Should have resolved color
    const resolvedColors = result.colors.filter(
      (c) => c.hex === "#7c3aed" && c.confidence === "high"
    );
    expect(resolvedColors.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts borderRadius fact", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const radiusFacts = result.facts.filter(
      (f) => f.property === "border-radius" && f.confidence === "high"
    );
    expect(radiusFacts.length).toBeGreaterThanOrEqual(1);
    expect(radiusFacts.some((f) => f.value === "12px")).toBe(true);
  });

  it("extracts boxShadow fact", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const shadowFacts = result.facts.filter(
      (f) => f.property === "box-shadow" && f.confidence === "high"
    );
    expect(shadowFacts.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts fontFamily fact", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const fontFacts = result.facts.filter(
      (f) => f.property === "font-family" && f.confidence === "high"
    );
    expect(fontFacts.length).toBeGreaterThanOrEqual(1);
    expect(fontFacts.some((f) => f.value.includes("Inter"))).toBe(true);
  });

  it("tags dynamic values as low confidence", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    const lowConfidence = result.facts.filter(
      (f) => f.confidence === "low"
    );
    // dynamicPadding and conditional background should be low confidence
    expect(lowConfidence.length).toBeGreaterThanOrEqual(1);
  });

  it("handles numeric values (converted to px)", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    // margin: 16 should become "16px"
    const numericMargin = result.facts.find(
      (f) => f.property === "margin" && f.value === "16px"
    );
    expect(numericMargin).toBeDefined();
  });

  it("sets source to inline for all facts", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    for (const fact of result.facts) {
      expect(fact.source).toBe("inline");
    }
    for (const color of result.colors) {
      expect(color.source).toBe("inline");
    }
  });

  it("extracts suppressions from JSX comments", () => {
    const content = readFileSync(join(FIXTURES, "inline-styles.tsx"), "utf-8");
    const result = parseInlineStyles(content, "inline-styles.tsx");

    expect(result.suppressions.length).toBeGreaterThanOrEqual(1);
    expect(result.suppressions.some((s) => s.signals.includes("purple-plague"))).toBe(true);
  });
});

describe("parseInlineStyles with simple JSX", () => {
  it("parses style={{ padding: '16px' }} into a StyleFact", () => {
    const content = `
      export function Box() {
        return <div style={{ padding: '16px' }}>Content</div>;
      }
    `;
    const result = parseInlineStyles(content, "Box.tsx");

    const paddingFact = result.facts.find((f) => f.property === "padding");
    expect(paddingFact).toBeDefined();
    expect(paddingFact!.value).toBe("16px");
    expect(paddingFact!.source).toBe("inline");
    expect(paddingFact!.confidence).toBe("high");
  });

  it("parses color values into ColorFact", () => {
    const content = `
      export function Box() {
        return <div style={{ color: '#ff0000', backgroundColor: 'blue' }}>Content</div>;
      }
    `;
    const result = parseInlineStyles(content, "Box.tsx");

    expect(result.colors.length).toBeGreaterThanOrEqual(2);
    const redColor = result.colors.find((c) => c.hex?.includes("ff0000"));
    expect(redColor).toBeDefined();
  });

  it("handles empty style object", () => {
    const content = `
      export function Box() {
        return <div style={{}}>Content</div>;
      }
    `;
    const result = parseInlineStyles(content, "Box.tsx");
    expect(result.facts).toHaveLength(0);
  });

  it("handles variable style reference as low confidence", () => {
    const content = `
      const myStyle = { padding: '16px' };
      export function Box() {
        return <div style={myStyle}>Content</div>;
      }
    `;
    const result = parseInlineStyles(content, "Box.tsx");

    const refFact = result.facts.find((f) => f.property === "style-ref");
    expect(refFact).toBeDefined();
    expect(refFact!.confidence).toBe("low");
  });
});

describe("extractInlineStyles", () => {
  it("processes files and reports health", () => {
    const files = [join(FIXTURES, "inline-styles.tsx")];
    const result = extractInlineStyles(files);

    expect(result.name).toBe("inline");
    expect(result.status).toBe("healthy");
    expect(result.filesAttempted).toBe(1);
    expect(result.filesParsed).toBe(1);
    expect(result.coverage).toBe(1);
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it("reports healthy for empty file list", () => {
    const result = extractInlineStyles([]);
    expect(result.status).toBe("healthy");
    expect(result.coverage).toBe(1);
  });

  it("handles non-existent files", () => {
    const files = [
      join(FIXTURES, "inline-styles.tsx"),
      join(FIXTURES, "nonexistent.tsx"),
    ];
    const result = extractInlineStyles(files);
    expect(result.filesAttempted).toBe(2);
    expect(result.filesParsed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.status).toBe("degraded");
  });
});
