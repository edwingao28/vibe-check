import { describe, it, expect } from "vitest";
import { fontCrime } from "../../src/signals/font-crime.js";
import { makeContext, makeFact } from "./__helpers__/make-context.js";

describe("Font Crime signal", () => {
  it("scores high (sloppy) with a single font family", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "font-family", value: "Inter", file: "layout.tsx", line: 3 }),
        makeFact({ property: "font-family", value: "Inter", file: "page.tsx", line: 5 }),
        makeFact({ property: "font-family", value: "Inter", file: "card.tsx", line: 12 }),
      ],
    });

    const result = fontCrime.analyze(ctx);
    expect(result.status).toBe("scored");
    expect(result.score).toBe(0.75); // 1 distinct font → 1 - 1/4 = 0.75
    expect(result.score).toBeGreaterThanOrEqual(0.6);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it("scores 1.0 (maximum slop) with zero font families", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "padding", value: "16px" }),
        makeFact({ property: "margin", value: "8px" }),
      ],
    });

    const result = fontCrime.analyze(ctx);
    expect(result.status).toBe("scored");
    expect(result.score).toBe(1.0);
  });

  it("scores low (clean) with 4+ distinct font families", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "font-family", value: "Inter" }),
        makeFact({ property: "font-family", value: "Playfair Display" }),
        makeFact({ property: "font-family", value: "JetBrains Mono" }),
        makeFact({ property: "font-family", value: "Source Sans Pro" }),
      ],
    });

    const result = fontCrime.analyze(ctx);
    expect(result.status).toBe("scored");
    expect(result.score).toBe(0.0);
    expect(result.score).toBeGreaterThanOrEqual(0.0);
    expect(result.score).toBeLessThanOrEqual(0.3);
  });

  it("scores 0.5 with 2 distinct font families", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "font-family", value: "Inter" }),
        makeFact({ property: "font-family", value: "Playfair Display" }),
      ],
    });

    const result = fontCrime.analyze(ctx);
    expect(result.score).toBe(0.5);
  });

  it("scores 0.25 with 3 distinct font families", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "font-family", value: "Inter" }),
        makeFact({ property: "font-family", value: "Playfair Display" }),
        makeFact({ property: "font-family", value: "JetBrains Mono" }),
      ],
    });

    const result = fontCrime.analyze(ctx);
    expect(result.score).toBe(0.25);
  });

  it("handles empty facts array", () => {
    const ctx = makeContext({ facts: [] });
    const result = fontCrime.analyze(ctx);
    expect(result.status).toBe("scored");
    expect(result.score).toBe(1.0); // No fonts = maximum slop
  });

  it("deduplicates quoted font family names", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "font-family", value: "'Inter'" }),
        makeFact({ property: "font-family", value: '"Inter"' }),
        makeFact({ property: "font-family", value: "Inter" }),
      ],
    });

    const result = fontCrime.analyze(ctx);
    expect(result.score).toBe(0.75); // All same font
  });

  it("ignores inherit/initial/unset values", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "font-family", value: "inherit" }),
        makeFact({ property: "font-family", value: "initial" }),
        makeFact({ property: "font-family", value: "Inter" }),
      ],
    });

    const result = fontCrime.analyze(ctx);
    expect(result.score).toBe(0.75); // Only 1 real font
  });

  it("provides evidence with file locations", () => {
    const ctx = makeContext({
      facts: [
        makeFact({ property: "font-family", value: "Inter", file: "layout.tsx", line: 3 }),
      ],
    });

    const result = fontCrime.analyze(ctx);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].files).toContain("layout.tsx:3");
  });
});
