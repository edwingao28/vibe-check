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
 * produced by any extractor. They return "insufficient_data" and their
 * Content and Structure categories are excluded from the overall score.
 * This means the overall score is driven entirely by Tier 1 signals.
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
    overall: { min: 50, max: 75 },
    intent: { tier: "None" as const },
    signals: {
      "font-crime": { min: 0.4, max: 1.0 },
      "shadow-realm": { min: 0.4, max: 1.0 },
      "purple-plague": { min: 0.5, max: 1.0 },
      "gradient-overload": { min: 0.3, max: 1.0 },
    },
  },
  clean: {
    overall: { min: 0, max: 25 },
    intent: { tier: "Full" as const },
  },
  "tailwind-only": {
    overall: { min: 45, max: 75 },
    intent: { tier: "None" as const },
  },
  minimal: {
    overall: { min: 25, max: 45 },
  },
  "design-system": {
    intent: { tier: "Full" as const, minScore: 56 },
  },
};
