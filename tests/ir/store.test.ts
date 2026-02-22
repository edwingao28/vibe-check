import { describe, it, expect } from "vitest";
import { IRStore } from "../../src/ir/store.js";
import type { ExtractorResult } from "../../src/extractors/types.js";

describe("IRStore", () => {
  it("collects facts from multiple extractors", () => {
    const store = new IRStore();
    const result1: ExtractorResult = {
      name: "css",
      status: "healthy",
      filesAttempted: 10,
      filesParsed: 10,
      coverage: 1.0,
      facts: [{ property: "font-family", value: "Inter", rawValue: "Inter", source: "css", file: "a.css", line: 1, confidence: "high" }],
      colors: [],
      texts: [],
      structures: [],
      suppressions: [],
      errors: [],
    };
    const result2: ExtractorResult = {
      name: "tailwind",
      status: "degraded",
      filesAttempted: 5,
      filesParsed: 4,
      coverage: 0.8,
      facts: [{ property: "padding", value: "16px", rawValue: "p-4", source: "tailwind", file: "b.tsx", line: 5, confidence: "high" }],
      colors: [],
      texts: [],
      structures: [],
      suppressions: [],
      errors: [{ file: "c.tsx", message: "dynamic class" }],
    };

    store.addExtractorResult(result1);
    store.addExtractorResult(result2);

    expect(store.facts).toHaveLength(2);
    expect(store.extractorHealth.get("css")).toBe("healthy");
    expect(store.extractorHealth.get("tailwind")).toBe("degraded");

    const coverage = store.getCoverage();
    expect(coverage.filesAttempted).toBe(15);
    expect(coverage.filesParsed).toBe(14);
    expect(coverage.overallCoverage).toBeCloseTo(14 / 15);
  });

  it("handles empty state", () => {
    const store = new IRStore();
    expect(store.facts).toHaveLength(0);
    const coverage = store.getCoverage();
    expect(coverage.overallCoverage).toBe(1);
  });
});
