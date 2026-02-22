import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { parseTailwindFile, extractTailwind } from "../../src/extractors/tailwind.js";
import { readFileSync } from "node:fs";

const FIXTURES = join(import.meta.dirname, "__fixtures__");

describe("parseTailwindFile", () => {
  it("extracts padding facts from Tailwind classes", () => {
    const content = readFileSync(join(FIXTURES, "tailwind-component.tsx"), "utf-8");
    const result = parseTailwindFile(content, "tailwind-component.tsx");

    const paddingFacts = result.facts.filter((f) =>
      f.property.startsWith("padding")
    );
    expect(paddingFacts.length).toBeGreaterThanOrEqual(2);

    // p-8 should resolve to 32px
    const p8 = paddingFacts.find((f) => f.rawValue === "p-8");
    expect(p8).toBeDefined();
    expect(p8!.value).toBe("32px");
    expect(p8!.source).toBe("tailwind");
    expect(p8!.confidence).toBe("high");
  });

  it("extracts margin facts from Tailwind classes", () => {
    const content = readFileSync(join(FIXTURES, "tailwind-component.tsx"), "utf-8");
    const result = parseTailwindFile(content, "tailwind-component.tsx");

    const marginFacts = result.facts.filter((f) =>
      f.property.startsWith("margin")
    );
    expect(marginFacts.length).toBeGreaterThanOrEqual(2);

    // m-4 should resolve to 16px
    const m4 = marginFacts.find((f) => f.rawValue === "m-4");
    expect(m4).toBeDefined();
    expect(m4!.value).toBe("16px");
  });

  it("extracts shadow facts from Tailwind classes", () => {
    const content = readFileSync(join(FIXTURES, "tailwind-component.tsx"), "utf-8");
    const result = parseTailwindFile(content, "tailwind-component.tsx");

    const shadowFacts = result.facts.filter((f) => f.property === "box-shadow");
    expect(shadowFacts.length).toBeGreaterThanOrEqual(2);

    // shadow-lg should be present
    const shadowLg = shadowFacts.find((f) => f.rawValue === "shadow-lg");
    expect(shadowLg).toBeDefined();
    expect(shadowLg!.confidence).toBe("high");
  });

  it("extracts border-radius facts from Tailwind classes", () => {
    const content = readFileSync(join(FIXTURES, "tailwind-component.tsx"), "utf-8");
    const result = parseTailwindFile(content, "tailwind-component.tsx");

    const radiusFacts = result.facts.filter((f) => f.property === "border-radius");
    expect(radiusFacts.length).toBeGreaterThanOrEqual(2);

    // rounded-lg should resolve to 0.5rem
    const roundedLg = radiusFacts.find((f) => f.rawValue === "rounded-lg");
    expect(roundedLg).toBeDefined();
    expect(roundedLg!.value).toBe("0.5rem");
  });

  it("extracts color facts from Tailwind color classes", () => {
    const content = readFileSync(join(FIXTURES, "tailwind-component.tsx"), "utf-8");
    const result = parseTailwindFile(content, "tailwind-component.tsx");

    // Should have color facts
    expect(result.colors.length).toBeGreaterThanOrEqual(3);

    // bg-purple-500 should resolve to a purple color
    const purpleColor = result.colors.find((c) => c.token === "purple-500");
    expect(purpleColor).toBeDefined();
    expect(purpleColor!.hex).toBe("#a855f7");
    expect(purpleColor!.hsl).toBeDefined();
    expect(purpleColor!.hsl![0]).toBeGreaterThan(250);
    expect(purpleColor!.confidence).toBe("high");
  });

  it("extracts font-family facts from Tailwind font classes", () => {
    const content = readFileSync(join(FIXTURES, "tailwind-component.tsx"), "utf-8");
    const result = parseTailwindFile(content, "tailwind-component.tsx");

    const fontFacts = result.facts.filter((f) => f.property === "font-family");
    expect(fontFacts.length).toBeGreaterThanOrEqual(1);

    // font-sans should be present
    const fontSans = fontFacts.find((f) => f.rawValue === "font-sans");
    expect(fontSans).toBeDefined();
  });

  it("extracts gap facts from Tailwind gap classes", () => {
    const content = readFileSync(join(FIXTURES, "tailwind-component.tsx"), "utf-8");
    const result = parseTailwindFile(content, "tailwind-component.tsx");

    const gapFacts = result.facts.filter((f) => f.property === "gap");
    expect(gapFacts.length).toBeGreaterThanOrEqual(1);

    // gap-6 should resolve to 24px
    const gap6 = gapFacts.find((f) => f.rawValue === "gap-6");
    expect(gap6).toBeDefined();
    expect(gap6!.value).toBe("24px");
  });

  it("extracts suppressions from JSX comments", () => {
    const content = readFileSync(join(FIXTURES, "tailwind-component.tsx"), "utf-8");
    const result = parseTailwindFile(content, "tailwind-component.tsx");

    // Should detect the slop-ignore comment
    expect(result.suppressions.length).toBeGreaterThanOrEqual(1);
    expect(result.suppressions.some((s) => s.signals.includes("cta-mania"))).toBe(true);
  });

  it("sets source to tailwind for all facts", () => {
    const content = readFileSync(join(FIXTURES, "tailwind-component.tsx"), "utf-8");
    const result = parseTailwindFile(content, "tailwind-component.tsx");

    for (const fact of result.facts) {
      expect(fact.source).toBe("tailwind");
    }
    for (const color of result.colors) {
      expect(color.source).toBe("tailwind");
    }
  });
});

describe("parseTailwindFile with specific classes", () => {
  it("resolves p-4 to padding: 16px", () => {
    const content = `<div className="p-4">Content</div>`;
    const result = parseTailwindFile(content, "test.tsx");

    const paddingFact = result.facts.find((f) => f.rawValue === "p-4");
    expect(paddingFact).toBeDefined();
    expect(paddingFact!.property).toBe("padding");
    expect(paddingFact!.value).toBe("16px");
  });

  it("resolves text-purple-500 to a ColorFact with HSL", () => {
    const content = `<span className="text-purple-500">Text</span>`;
    const result = parseTailwindFile(content, "test.tsx");

    const colorFact = result.colors.find((c) => c.token === "purple-500");
    expect(colorFact).toBeDefined();
    expect(colorFact!.hex).toBe("#a855f7");
    expect(colorFact!.hsl).toBeDefined();
    // Purple hue range
    expect(colorFact!.hsl![0]).toBeGreaterThan(250);
    expect(colorFact!.hsl![0]).toBeLessThan(300);
  });

  it("handles multiple classes on one element", () => {
    const content = `<div className="p-4 m-2 bg-blue-500 rounded-lg shadow-md">Content</div>`;
    const result = parseTailwindFile(content, "test.tsx");

    expect(result.facts.length).toBeGreaterThanOrEqual(4);
    expect(result.colors.length).toBeGreaterThanOrEqual(1);
  });

  it("handles className with single quotes", () => {
    const content = `<div className='p-4 m-2'>Content</div>`;
    const result = parseTailwindFile(content, "test.tsx");

    expect(result.facts.length).toBeGreaterThanOrEqual(2);
  });

  it("handles template literal classNames", () => {
    const content = "<div className={`p-4 m-2 bg-red-500`}>Content</div>";
    const result = parseTailwindFile(content, "test.tsx");

    expect(result.facts.length).toBeGreaterThanOrEqual(2);
    expect(result.colors.length).toBeGreaterThanOrEqual(1);
  });

  it("handles responsive prefixes", () => {
    const content = `<div className="p-4 md:p-8 lg:p-12">Content</div>`;
    const result = parseTailwindFile(content, "test.tsx");

    // All three should be extracted
    expect(result.facts.length).toBeGreaterThanOrEqual(3);
  });
});

describe("extractTailwind", () => {
  it("processes files and reports health", () => {
    const files = [join(FIXTURES, "tailwind-component.tsx")];
    const result = extractTailwind(files);

    expect(result.name).toBe("tailwind");
    expect(result.status).toBe("healthy");
    expect(result.filesAttempted).toBe(1);
    expect(result.filesParsed).toBe(1);
    expect(result.coverage).toBe(1);
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.colors.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it("reports healthy for empty file list", () => {
    const result = extractTailwind([]);
    expect(result.status).toBe("healthy");
    expect(result.coverage).toBe(1);
  });

  it("handles non-existent files", () => {
    const files = [
      join(FIXTURES, "tailwind-component.tsx"),
      join(FIXTURES, "nonexistent.tsx"),
    ];
    const result = extractTailwind(files);
    expect(result.filesAttempted).toBe(2);
    expect(result.filesParsed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.status).toBe("degraded");
  });
});
