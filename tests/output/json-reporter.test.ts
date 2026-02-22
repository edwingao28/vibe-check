import { describe, it, expect } from "vitest";
import { generateReport } from "../../src/output/json-reporter.js";
import { IRStore } from "../../src/ir/store.js";
import type { ScoringResult } from "../../src/scoring/types.js";
import type { ScopeResult } from "../../src/scope/types.js";
import type { ExtractorResult } from "../../src/extractors/types.js";
import type { ScanReport } from "../../src/output/types.js";

/**
 * Creates a mock ScoringResult for testing.
 */
function makeMockScoringResult(overrides?: Partial<ScoringResult>): ScoringResult {
  return {
    slopScore: 67,
    band: "High",
    confidence: "Medium",
    categories: [
      { id: "typography-color", name: "Typography & Color", score: 0.72, signals: ["font-crime", "purple-plague"] },
      { id: "spacing-effects", name: "Spacing & Effects", score: 0.58, signals: ["whitespace-wasteland", "shadow-realm", "border-radius-maximum", "gradient-overload"] },
      { id: "content", name: "Content", score: 0.48, signals: ["buzzword-bingo", "hero-syndrome"] },
      { id: "structure", name: "Structure", score: 0.63, signals: ["cookie-cutter-layout", "cta-mania"] },
    ],
    intent: {
      score: 34,
      tier: "Partial",
      evidence: [
        { type: "tailwind-theme", count: 8, description: "8 custom theme entries in tailwind.config.js" },
        { type: "css-vars", count: 12, description: "12 CSS custom properties in global scope" },
      ],
      attenuations: {
        "font-crime": 0.7,
        "purple-plague": 0.6,
        "border-radius-maximum": 0.8,
        "shadow-realm": 0.9,
      },
    },
    signals: [
      {
        id: "font-crime",
        name: "Font Crime",
        category: "typography-color",
        score: 0.595,
        rawScore: 0.85,
        attenuatedScore: 0.595,
        status: "scored",
        confidence: "high",
        evidence: [{ summary: "1 font family across 47 components", files: ["src/app/layout.tsx:3"] }],
      },
      {
        id: "purple-plague",
        name: "Purple Plague",
        category: "typography-color",
        score: 0.42,
        rawScore: 0.7,
        attenuatedScore: 0.42,
        status: "scored",
        confidence: "medium",
        evidence: [{ summary: "Purple hue dominant in 65% of colors", files: ["src/globals.css:5"] }],
      },
    ],
    ...overrides,
  };
}

/**
 * Creates a mock IRStore with sample extractor results.
 */
function makeMockIRStore(): IRStore {
  const store = new IRStore();

  const cssResult: ExtractorResult = {
    name: "css",
    status: "healthy",
    filesAttempted: 23,
    filesParsed: 23,
    coverage: 1.0,
    facts: [
      { property: "font-family", value: "Inter", rawValue: "Inter", source: "css", file: "src/globals.css", line: 1, confidence: "high" },
    ],
    colors: [],
    texts: [],
    structures: [],
    suppressions: [],
    errors: [],
  };

  const tailwindResult: ExtractorResult = {
    name: "tailwind",
    status: "degraded",
    filesAttempted: 50,
    filesParsed: 45,
    coverage: 0.9,
    facts: [
      { property: "padding", value: "16px", rawValue: "p-4", source: "tailwind", file: "src/components/Card.tsx", line: 5, confidence: "high" },
    ],
    colors: [],
    texts: [],
    structures: [],
    suppressions: [],
    errors: [{ file: "src/components/Dynamic.tsx", message: "dynamic class expression" }],
    note: "5 files contain dynamic class expressions",
  };

  store.addExtractorResult(cssResult);
  store.addExtractorResult(tailwindResult);

  return store;
}

/**
 * Creates a mock ScopeResult.
 */
function makeMockScopeResult(): ScopeResult {
  return {
    method: "smart-ui",
    resolvedPath: "src/",
    files: Array.from({ length: 142 }, (_, i) => `src/file-${i}.tsx`),
    excludesApplied: ["node_modules/**", ".next/**", "**/*.test.*"],
  };
}

describe("generateReport", () => {
  it("produces a report with all required top-level fields", () => {
    const report = generateReport({
      scoringResult: makeMockScoringResult(),
      irStore: makeMockIRStore(),
      scopeResult: makeMockScopeResult(),
      configFile: ".sloprc",
      duration: 3420,
      flags: ["--verbose"],
    });

    // Check all required top-level fields exist
    expect(report).toHaveProperty("schemaVersion");
    expect(report).toHaveProperty("scannerVersion");
    expect(report).toHaveProperty("scoringEpoch");
    expect(report).toHaveProperty("scanMeta");
    expect(report).toHaveProperty("scope");
    expect(report).toHaveProperty("coverage");
    expect(report).toHaveProperty("overall");
    expect(report).toHaveProperty("intent");
    expect(report).toHaveProperty("categories");
    expect(report).toHaveProperty("signals");
    expect(report).toHaveProperty("suppressions");
    expect(report).toHaveProperty("recommendations");
  });

  it("sets correct schema and version metadata", () => {
    const report = generateReport({
      scoringResult: makeMockScoringResult(),
      irStore: makeMockIRStore(),
      scopeResult: makeMockScopeResult(),
      configFile: null,
      duration: 1000,
      flags: [],
    });

    expect(report.schemaVersion).toBe("1.0.0");
    expect(report.scannerVersion).toBe("0.1.0");
    expect(report.scoringEpoch).toBe("v1");
  });

  it("populates scanMeta correctly", () => {
    const report = generateReport({
      scoringResult: makeMockScoringResult(),
      irStore: makeMockIRStore(),
      scopeResult: makeMockScopeResult(),
      configFile: ".sloprc",
      duration: 3420,
      flags: ["--verbose", "--json"],
    });

    expect(report.scanMeta.duration).toBe(3420);
    expect(report.scanMeta.flags).toEqual(["--verbose", "--json"]);
    expect(report.scanMeta.configFile).toBe(".sloprc");
    expect(report.scanMeta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("populates scope data from ScopeResult", () => {
    const scopeResult = makeMockScopeResult();
    const report = generateReport({
      scoringResult: makeMockScoringResult(),
      irStore: makeMockIRStore(),
      scopeResult,
      configFile: null,
      duration: 1000,
      flags: [],
    });

    expect(report.scope.method).toBe("smart-ui");
    expect(report.scope.resolvedPath).toBe("src/");
    expect(report.scope.filesScanned).toBe(142);
    expect(report.scope.excludesApplied).toEqual(["node_modules/**", ".next/**", "**/*.test.*"]);
  });

  it("populates coverage data from IRStore", () => {
    const report = generateReport({
      scoringResult: makeMockScoringResult(),
      irStore: makeMockIRStore(),
      scopeResult: makeMockScopeResult(),
      configFile: null,
      duration: 1000,
      flags: [],
    });

    expect(report.coverage.filesAttempted).toBe(73); // 23 + 50
    expect(report.coverage.filesParsed).toBe(68); // 23 + 45
    expect(report.coverage.overallCoverage).toBeCloseTo(68 / 73, 2);
    expect(report.coverage.extractors).toHaveLength(2);
    expect(report.coverage.extractors[0].name).toBe("css");
    expect(report.coverage.extractors[0].status).toBe("healthy");
    expect(report.coverage.extractors[1].name).toBe("tailwind");
    expect(report.coverage.extractors[1].status).toBe("degraded");
    expect(report.coverage.extractors[1].note).toBe("5 files contain dynamic class expressions");
  });

  it("populates overall score data", () => {
    const report = generateReport({
      scoringResult: makeMockScoringResult(),
      irStore: makeMockIRStore(),
      scopeResult: makeMockScopeResult(),
      configFile: null,
      duration: 1000,
      flags: [],
    });

    expect(report.overall.slopScore).toBe(67);
    expect(report.overall.band).toBe("High");
    expect(report.overall.confidence).toBe("Medium");
  });

  it("populates intent data", () => {
    const report = generateReport({
      scoringResult: makeMockScoringResult(),
      irStore: makeMockIRStore(),
      scopeResult: makeMockScopeResult(),
      configFile: null,
      duration: 1000,
      flags: [],
    });

    expect(report.intent.score).toBe(34);
    expect(report.intent.tier).toBe("Partial");
    expect(report.intent.evidence).toHaveLength(2);
    expect(report.intent.attenuations["font-crime"]).toBe(0.7);
  });

  it("populates categories array", () => {
    const report = generateReport({
      scoringResult: makeMockScoringResult(),
      irStore: makeMockIRStore(),
      scopeResult: makeMockScopeResult(),
      configFile: null,
      duration: 1000,
      flags: [],
    });

    expect(report.categories).toHaveLength(4);
    expect(report.categories[0].id).toBe("typography-color");
    expect(report.categories[0].name).toBe("Typography & Color");
    expect(report.categories[0].score).toBe(0.72);
    expect(report.categories[0].signals).toEqual(["font-crime", "purple-plague"]);
  });

  it("populates signals array", () => {
    const report = generateReport({
      scoringResult: makeMockScoringResult(),
      irStore: makeMockIRStore(),
      scopeResult: makeMockScopeResult(),
      configFile: null,
      duration: 1000,
      flags: [],
    });

    expect(report.signals).toHaveLength(2);
    expect(report.signals[0].id).toBe("font-crime");
    expect(report.signals[0].rawScore).toBe(0.85);
    expect(report.signals[0].attenuatedScore).toBe(0.595);
    expect(report.signals[0].status).toBe("scored");
    expect(report.signals[0].evidence).toHaveLength(1);
  });

  it("suggests deep scan when slopScore > 50", () => {
    const report = generateReport({
      scoringResult: makeMockScoringResult({ slopScore: 67 }),
      irStore: makeMockIRStore(),
      scopeResult: makeMockScopeResult(),
      configFile: null,
      duration: 1000,
      flags: [],
    });

    expect(report.recommendations.deepScanSuggested).toBe(true);
    expect(report.recommendations.reason).toContain("Slop Score exceeds 50");
  });

  it("does not suggest deep scan when slopScore <= 50", () => {
    const report = generateReport({
      scoringResult: makeMockScoringResult({ slopScore: 30 }),
      irStore: makeMockIRStore(),
      scopeResult: makeMockScopeResult(),
      configFile: null,
      duration: 1000,
      flags: [],
    });

    expect(report.recommendations.deepScanSuggested).toBe(false);
    expect(report.recommendations.reason).toBe("");
  });

  it("produces valid JSON when serialized", () => {
    const report = generateReport({
      scoringResult: makeMockScoringResult(),
      irStore: makeMockIRStore(),
      scopeResult: makeMockScopeResult(),
      configFile: null,
      duration: 1000,
      flags: [],
    });

    const json = JSON.stringify(report);
    const parsed = JSON.parse(json) as ScanReport;

    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(parsed.overall.slopScore).toBe(67);
  });

  it("handles empty IRStore gracefully", () => {
    const emptyStore = new IRStore();

    const report = generateReport({
      scoringResult: makeMockScoringResult({ slopScore: 0, band: "Low", confidence: "Low" }),
      irStore: emptyStore,
      scopeResult: {
        method: "smart-ui",
        resolvedPath: ".",
        files: [],
        excludesApplied: [],
      },
      configFile: null,
      duration: 100,
      flags: [],
    });

    expect(report.coverage.filesAttempted).toBe(0);
    expect(report.coverage.filesParsed).toBe(0);
    expect(report.coverage.overallCoverage).toBe(1); // Empty = 100% coverage (nothing to fail)
    expect(report.coverage.extractors).toHaveLength(0);
  });

  it("includes suppressions from IRStore", () => {
    const store = new IRStore();
    const result: ExtractorResult = {
      name: "css",
      status: "healthy",
      filesAttempted: 1,
      filesParsed: 1,
      coverage: 1.0,
      facts: [],
      colors: [],
      texts: [],
      structures: [],
      suppressions: [
        { signals: ["shadow-realm"], file: "src/components/Hero.tsx", line: 14 },
        { signals: ["font-crime", "gradient-overload"], file: "src/app/page.tsx", line: 5 },
      ],
      errors: [],
    };
    store.addExtractorResult(result);

    const report = generateReport({
      scoringResult: makeMockScoringResult(),
      irStore: store,
      scopeResult: makeMockScopeResult(),
      configFile: null,
      duration: 1000,
      flags: [],
    });

    expect(report.suppressions).toHaveLength(2);
    expect(report.suppressions[0].signal).toBe("shadow-realm");
    expect(report.suppressions[0].file).toBe("src/components/Hero.tsx");
    expect(report.suppressions[0].line).toBe(14);
    expect(report.suppressions[0].type).toBe("inline");
    expect(report.suppressions[1].signal).toBe("font-crime, gradient-overload");
  });
});
