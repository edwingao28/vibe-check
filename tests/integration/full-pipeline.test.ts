/**
 * Integration tests — full pipeline end-to-end.
 *
 * Runs the complete scanner pipeline programmatically against each
 * fixture project and asserts results against golden band expectations.
 *
 * Pipeline mirrors src/index.ts:
 *   resolve scope -> run extractors -> build IR -> run signals ->
 *   compute intent -> attenuate -> aggregate -> derive band/confidence
 */

import { describe, it, expect } from "vitest";
import { join, resolve, extname } from "node:path";

import { loadConfig } from "../../src/config/loader.js";
import { resolveScope } from "../../src/scope/resolver.js";
import { IRStore } from "../../src/ir/store.js";

// Extractors
import { extractCss } from "../../src/extractors/css.js";
import { extractTailwind } from "../../src/extractors/tailwind.js";
import { extractInlineStyles } from "../../src/extractors/inline.js";
import { extractCssModules } from "../../src/extractors/css-module.js";

// Signals
import { runSignals } from "../../src/signals/registry.js";

// Scoring
import { aggregate } from "../../src/scoring/aggregator.js";
import { calculateIntent } from "../../src/scoring/intent.js";
import { applyAttenuation } from "../../src/scoring/attenuation.js";
import { getBand, getConfidence } from "../../src/scoring/bands.js";

import type { SignalResult } from "../../src/signals/types.js";
import type { Band, Confidence, IntentTier } from "../../src/scoring/types.js";

import { GOLDEN_BANDS } from "./golden-bands.js";

// ---- Helper: run the full pipeline on a fixture directory ----

interface PipelineResult {
  slopScore: number;
  band: Band;
  confidence: Confidence;
  intentScore: number;
  intentTier: IntentTier;
  signalResults: SignalResult[];
  extractorStatuses: string[];
}

function scanFixture(fixtureName: string): PipelineResult {
  const fixtureRoot = join(import.meta.dirname, "../../fixtures", fixtureName);

  // 1. Load config
  const { config } = loadConfig(fixtureRoot);

  // 2. Resolve scope
  const scope = resolveScope(fixtureRoot, undefined, false, config);

  // 3. Run extractors on scoped files -> feed into IRStore
  const irStore = new IRStore();

  // Partition files by type for the appropriate extractor
  const cssFiles: string[] = [];
  const cssModuleFiles: string[] = [];
  const jsxTsxFiles: string[] = [];

  for (const file of scope.files) {
    const fullPath = resolve(fixtureRoot, file);
    const ext = extname(file);

    if (
      file.endsWith(".module.css") ||
      file.endsWith(".module.scss") ||
      file.endsWith(".module.sass")
    ) {
      cssModuleFiles.push(fullPath);
    } else if (ext === ".css" || ext === ".scss" || ext === ".sass") {
      cssFiles.push(fullPath);
    }

    if (
      ext === ".tsx" ||
      ext === ".jsx" ||
      ext === ".ts" ||
      ext === ".js" ||
      ext === ".mdx"
    ) {
      jsxTsxFiles.push(fullPath);
    }
  }

  // Run CSS extractor
  if (cssFiles.length > 0) {
    const cssResult = extractCss(cssFiles);
    irStore.addExtractorResult(cssResult);
  }

  // Run Tailwind extractor
  if (jsxTsxFiles.length > 0) {
    try {
      const tailwindResult = extractTailwind(jsxTsxFiles);
      irStore.addExtractorResult(tailwindResult);
    } catch {
      // Tailwind extractor failed — skip gracefully
    }
  }

  // Run Inline style extractor
  if (jsxTsxFiles.length > 0) {
    try {
      const inlineResult = extractInlineStyles(jsxTsxFiles);
      irStore.addExtractorResult(inlineResult);
    } catch {
      // Inline extractor failed — skip gracefully
    }
  }

  // Run CSS Module extractor
  if (cssModuleFiles.length > 0) {
    try {
      const cssModuleResult = extractCssModules(cssModuleFiles);
      irStore.addExtractorResult(cssModuleResult);
    } catch {
      // CSS Module extractor failed — skip gracefully
    }
  }

  // 4. Run signals via registry
  const signalContext = {
    facts: irStore.facts,
    colors: irStore.colors,
    texts: irStore.texts,
    structures: irStore.structures,
    suppressions: irStore.suppressions,
    extractorHealth: irStore.extractorHealth,
    config,
  };

  const signalResults = runSignals(signalContext, config);

  // 5. Calculate intent
  const intentResult = calculateIntent(irStore.facts, scope.files);

  // 6. Apply attenuation
  const attenuatedSignals = applyAttenuation(signalResults, intentResult.tier);

  // 7. Aggregate scores
  const { slopScore, categories } = aggregate(attenuatedSignals, config);

  // 8. Derive band and confidence
  const band = getBand(slopScore);
  const coverage = irStore.getCoverage();
  const extractorStatuses = irStore.getExtractorResults().map((r) => r.status);
  const excludedCategories = categories.filter((c) => Number.isNaN(c.score)).length;
  const confidence = getConfidence(coverage.overallCoverage, extractorStatuses, excludedCategories);

  return {
    slopScore: Math.round(slopScore * 100) / 100,
    band,
    confidence,
    intentScore: intentResult.score,
    intentTier: intentResult.tier,
    signalResults: attenuatedSignals,
    extractorStatuses,
  };
}

// ---- Tests ----

describe("Integration: full pipeline", () => {
  const fixtureNames = Object.keys(GOLDEN_BANDS);

  // Run each fixture and store results for use in tests
  const results = new Map<string, PipelineResult>();

  // Pre-scan all fixtures
  for (const name of fixtureNames) {
    results.set(name, scanFixture(name));
  }

  describe("pipeline completes without errors", () => {
    for (const name of fixtureNames) {
      it(`${name}: pipeline completes`, () => {
        const result = results.get(name)!;
        expect(result).toBeDefined();
        expect(typeof result.slopScore).toBe("number");
        expect(result.slopScore).toBeGreaterThanOrEqual(0);
        expect(result.slopScore).toBeLessThanOrEqual(100);
      });
    }
  });

  describe("no extractor failures", () => {
    for (const name of fixtureNames) {
      it(`${name}: no extractors report 'failed' status`, () => {
        const result = results.get(name)!;
        for (const status of result.extractorStatuses) {
          expect(status).not.toBe("failed");
        }
      });
    }
  });

  describe("overall score within golden band", () => {
    for (const name of fixtureNames) {
      const band = GOLDEN_BANDS[name];
      if (!band.overall) continue;

      it(`${name}: score ${band.overall.min}-${band.overall.max}`, () => {
        const result = results.get(name)!;
        expect(
          result.slopScore,
          `${name} slopScore ${result.slopScore} expected in [${band.overall!.min}, ${band.overall!.max}]`,
        ).toBeGreaterThanOrEqual(band.overall!.min);
        expect(
          result.slopScore,
          `${name} slopScore ${result.slopScore} expected in [${band.overall!.min}, ${band.overall!.max}]`,
        ).toBeLessThanOrEqual(band.overall!.max);
      });
    }
  });

  describe("intent tier matches expectation", () => {
    for (const name of fixtureNames) {
      const band = GOLDEN_BANDS[name];
      if (!band.intent) continue;

      it(`${name}: intent tier is "${band.intent.tier}"`, () => {
        const result = results.get(name)!;
        expect(
          result.intentTier,
          `${name} intentTier "${result.intentTier}" expected "${band.intent!.tier}" (score: ${result.intentScore})`,
        ).toBe(band.intent!.tier);
      });

      if (band.intent.minScore !== undefined) {
        it(`${name}: intent score >= ${band.intent.minScore}`, () => {
          const result = results.get(name)!;
          expect(
            result.intentScore,
            `${name} intentScore ${result.intentScore} expected >= ${band.intent!.minScore}`,
          ).toBeGreaterThanOrEqual(band.intent!.minScore!);
        });
      }
    }
  });

  describe("specific signal scores within golden band", () => {
    for (const name of fixtureNames) {
      const band = GOLDEN_BANDS[name];
      if (!band.signals) continue;

      for (const [signalId, signalBand] of Object.entries(band.signals)) {
        it(`${name}/${signalId}: score ${signalBand.min}-${signalBand.max}`, () => {
          const result = results.get(name)!;
          const signal = result.signalResults.find((s) => s.id === signalId);
          expect(
            signal,
            `Signal "${signalId}" not found in ${name} results`,
          ).toBeDefined();
          expect(
            signal!.rawScore,
            `${name}/${signalId} rawScore ${signal!.rawScore} expected in [${signalBand.min}, ${signalBand.max}]`,
          ).toBeGreaterThanOrEqual(signalBand.min);
          expect(
            signal!.rawScore,
            `${name}/${signalId} rawScore ${signal!.rawScore} expected in [${signalBand.min}, ${signalBand.max}]`,
          ).toBeLessThanOrEqual(signalBand.max);
        });
      }
    }
  });

  describe("diagnostic: print all scores", () => {
    it("prints fixture scores for debugging", () => {
      for (const name of fixtureNames) {
        const result = results.get(name)!;
        const signalSummary = result.signalResults
          .map((s) => `    ${s.id}: raw=${s.rawScore.toFixed(3)} att=${s.attenuatedScore.toFixed(3)} [${s.status}]`)
          .join("\n");

        console.log(
          `\n--- ${name} ---\n` +
          `  slopScore: ${result.slopScore}\n` +
          `  band: ${result.band}\n` +
          `  confidence: ${result.confidence}\n` +
          `  intentScore: ${result.intentScore}\n` +
          `  intentTier: ${result.intentTier}\n` +
          `  signals:\n${signalSummary}`,
        );
      }
    });
  });
});
