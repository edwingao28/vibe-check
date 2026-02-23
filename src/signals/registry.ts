/**
 * Signal registry.
 *
 * Imports all signal definitions and provides `runSignals()` which:
 * 1. Checks the config disabled list
 * 2. Checks extractor health for each signal's dependencies
 * 3. Runs each eligible signal
 * 4. Returns SignalResult[] for all signals
 *
 * Designed to be extensible: Tier 2 signals can be added to the
 * `tier1Signals` / exported `allSignals` array.
 */

import type { SignalDefinition, SignalResult, SignalContext } from "./types.js";
import type { ExtractorStatus } from "../extractors/types.js";
import type { SlopConfig } from "../config/types.js";

// Tier 1 signals
import { fontCrime } from "./font-crime.js";
import { purplePlague } from "./purple-plague.js";
import { whitespaceWasteland } from "./whitespace-wasteland.js";
import { shadowRealm } from "./shadow-realm.js";
import { borderRadiusMaximum } from "./border-radius-maximum.js";
import { gradientOverload } from "./gradient-overload.js";

// Tier 2 signals
import { heroSyndrome } from "./hero-syndrome.js";
import { buzzwordBingo } from "./buzzword-bingo.js";
import { cookieCutterLayout } from "./cookie-cutter-layout.js";
import { ctaMania } from "./cta-mania.js";
import { emojiInfestation } from "./emoji-infestation.js";
import { testimonialFactory } from "./testimonial-factory.js";
import { cardCarnival } from "./card-carnival.js";
import { stockPhotoSyndrome } from "./stock-photo-syndrome.js";
import { scaffoldBloat } from "./scaffold-bloat.js";
import { placeholderContent } from "./placeholder-content.js";
import { aiScaffoldSignature } from "./ai-scaffold-signature.js";
import { deadDependency } from "./dead-dependency.js";

/**
 * Tier 1 signal definitions (deterministic, always run).
 */
export const tier1Signals: SignalDefinition[] = [
  fontCrime,
  purplePlague,
  whitespaceWasteland,
  shadowRealm,
  borderRadiusMaximum,
  gradientOverload,
];

/**
 * Tier 2 signal definitions (heuristic-based).
 */
export const tier2Signals: SignalDefinition[] = [
  heroSyndrome,
  buzzwordBingo,
  cookieCutterLayout,
  ctaMania,
  emojiInfestation,
  testimonialFactory,
  cardCarnival,
  stockPhotoSyndrome,
  scaffoldBloat,
  placeholderContent,
  aiScaffoldSignature,
  deadDependency,
];

/**
 * All registered signals (Tier 1 + Tier 2).
 */
export const allSignals: SignalDefinition[] = [
  ...tier1Signals,
  ...tier2Signals,
];

/**
 * Check the health status of a signal's extractor dependencies.
 *
 * Returns:
 * - "all_healthy": all dependencies are "healthy"
 * - "some_degraded": at least one dependency is "degraded" but not all "failed"
 * - "all_failed": ALL dependencies are "failed" (or missing from health map)
 */
function checkDependencyHealth(
  needs: string[],
  extractorHealth: Map<string, ExtractorStatus>,
): "all_healthy" | "some_degraded" | "all_failed" {
  if (needs.length === 0) return "all_healthy";

  let allFailed = true;
  let allHealthy = true;

  for (const dep of needs) {
    const status = extractorHealth.get(dep);
    if (status === undefined || status === "failed") {
      allHealthy = false;
    } else if (status === "degraded") {
      allHealthy = false;
      allFailed = false;
    } else {
      // healthy
      allFailed = false;
    }
  }

  if (allFailed) return "all_failed";
  if (allHealthy) return "all_healthy";
  return "some_degraded";
}

/**
 * Create an insufficient_data result for a signal whose dependencies all failed.
 */
function makeInsufficientResult(signal: SignalDefinition): SignalResult {
  return {
    id: signal.id,
    name: signal.name,
    category: signal.category,
    score: 0,
    rawScore: 0,
    attenuatedScore: 0,
    status: "insufficient_data",
    confidence: "low",
    evidence: [
      {
        summary: `Required extractors [${signal.needs.join(", ")}] all failed`,
        files: [],
      },
    ],
  };
}

/**
 * Reduce confidence on a signal result when some dependencies are degraded.
 */
function reducedConfidence(
  result: SignalResult,
  healthStatus: "all_healthy" | "some_degraded",
): SignalResult {
  if (healthStatus === "some_degraded" && result.confidence === "high") {
    return { ...result, confidence: "medium" };
  }
  return result;
}

/**
 * Run all enabled signals against the given context.
 *
 * @param ctx - The signal context containing IR facts and extractor health
 * @param config - The SlopConfig (used to check disabled list)
 * @returns Array of SignalResult for every registered signal (including skipped/insufficient)
 */
export function runSignals(
  ctx: SignalContext,
  config: SlopConfig,
): SignalResult[] {
  const results: SignalResult[] = [];

  for (const signal of allSignals) {
    // Check if disabled in config
    if (config.signals.disabled.includes(signal.id)) {
      continue; // Skip entirely — disabled signals produce no result
    }

    // Check extractor dependency health
    const health = checkDependencyHealth(signal.needs, ctx.extractorHealth);

    if (health === "all_failed") {
      results.push(makeInsufficientResult(signal));
      continue;
    }

    // Run the signal
    const result = signal.analyze(ctx);

    // Reduce confidence if some dependencies are degraded
    results.push(reducedConfidence(result, health));
  }

  return results;
}
