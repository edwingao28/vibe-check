import type { SignalResult } from "../signals/types.js";
import type { IntentTier } from "./types.js";
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
export declare function applyAttenuation(signals: SignalResult[], intentTier: IntentTier): SignalResult[];
