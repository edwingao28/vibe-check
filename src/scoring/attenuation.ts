import type { SignalResult } from "../signals/types.js";
import type { IntentTier } from "./types.js";

/**
 * Attenuation multiplier table from SPEC section 5.3.
 *
 * These signals are "aesthetics-choice" signals that should be attenuated
 * when design intent is detected. The multiplier reduces the rawScore
 * to produce the attenuatedScore.
 *
 * | Signal               | None | Partial | Full |
 * |----------------------|------|---------|------|
 * | font-crime           | 1.0  | 0.7     | 0.4  |
 * | purple-plague        | 1.0  | 0.6     | 0.3  |
 * | border-radius-maximum| 1.0  | 0.8     | 0.5  |
 * | shadow-realm         | 1.0  | 0.9     | 0.7  |
 *
 * Non-attenuatable signals keep attenuatedScore = rawScore regardless of intent.
 */
const ATTENUATION_TABLE: Record<string, Record<IntentTier, number>> = {
  "font-crime": { None: 1.0, Partial: 0.7, Full: 0.4 },
  "purple-plague": { None: 1.0, Partial: 0.6, Full: 0.3 },
  "border-radius-maximum": { None: 1.0, Partial: 0.8, Full: 0.5 },
  "shadow-realm": { None: 1.0, Partial: 0.9, Full: 0.7 },
};

/**
 * Applies intent-based attenuation to signal scores.
 *
 * For each signal:
 *   - If the signal is in the attenuation table, multiply rawScore by the
 *     tier-specific multiplier to produce attenuatedScore.
 *   - Otherwise, attenuatedScore = rawScore (no attenuation).
 *
 * Returns a new array of SignalResult[] with updated attenuatedScore values.
 * The original array is not mutated.
 */
export function applyAttenuation(
  signals: SignalResult[],
  intentTier: IntentTier,
): SignalResult[] {
  return signals.map((signal) => {
    const multipliers = ATTENUATION_TABLE[signal.id];
    if (multipliers) {
      const factor = multipliers[intentTier];
      return {
        ...signal,
        attenuatedScore: signal.rawScore * factor,
      };
    }
    // Non-attenuatable: attenuatedScore = rawScore
    return {
      ...signal,
      attenuatedScore: signal.rawScore,
    };
  });
}
