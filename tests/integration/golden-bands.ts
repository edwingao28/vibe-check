/**
 * Golden band expectations for each fixture project.
 *
 * Each fixture has expected score ranges that define acceptable outputs.
 * Tests assert scores fall within these bands -- resilient to minor
 * algorithm tweaks while still validating the pipeline produces
 * sensible results.
 *
 * Note: Tier 2 signals (buzzword-bingo, hero-syndrome, cookie-cutter-layout,
 * cta-mania) depend on TextFact[] and StructuralFact[] which are not currently
 * produced by any extractor. They will score 0 in all fixtures. The golden
 * bands are calibrated against Tier 1 signals only.
 *
 * The maximum achievable overall score with Tier 2 at 0 is ~55.6 (when all
 * Tier 1 signals are at 1.0), because Content and Structure categories
 * (weight 0.8 each) contribute nothing to the weighted average.
 */

import type { IntentTier } from "../../src/scoring/types.js";

export interface SignalBand {
  min: number;
  max: number;
}

export interface FixtureBand {
  overall?: { min: number; max: number };
  intent?: { tier: IntentTier; minScore?: number };
  signals?: Record<string, SignalBand>;
}

export const GOLDEN_BANDS: Record<string, FixtureBand> = {
  "slop-heavy": {
    overall: { min: 30, max: 55 },
    intent: { tier: "None" as const },
    signals: {
      "font-crime": { min: 0.4, max: 1.0 },
      "shadow-realm": { min: 0.4, max: 1.0 },
      "purple-plague": { min: 0.5, max: 1.0 },
      "gradient-overload": { min: 0.5, max: 1.0 },
    },
  },
  "clean": {
    overall: { min: 0, max: 25 },
    intent: { tier: "Full" as const },
  },
  "tailwind-only": {
    overall: { min: 30, max: 55 },
    intent: { tier: "None" as const },
  },
  "minimal": {
    overall: { min: 0, max: 20 },
  },
  "design-system": {
    intent: { tier: "Full" as const, minScore: 56 },
  },
};
