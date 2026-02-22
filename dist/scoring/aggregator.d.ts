import type { SignalResult } from "../signals/types.js";
import type { CategoryResult } from "./types.js";
import type { SlopConfig } from "../config/types.js";
/**
 * Power mean category aggregation + overall slop score.
 *
 * For each category:
 *   1. Collect SignalResult[] belonging to it (by signalId match).
 *   2. Filter out signals with status "insufficient_data".
 *   3. If >50% of the category's signals are insufficient, exclude the
 *      category from the overall score (its CategoryResult score is NaN).
 *   4. Power mean with p=2: C_k = sqrt(sum(w_i * s_i^2) / sum(w_i))
 *      where w_i = 1 for all signals within the category,
 *      and s_i = attenuatedScore.
 *
 * Overall: slopScore = 100 * sum(W_k * C_k) / sum(W_k) for valid categories.
 * Category weights W_k come from config.signals.categoryWeights, falling back
 * to the defaults in CATEGORIES.
 *
 * The result is clamped to [0, 100].
 */
export declare function aggregate(signals: SignalResult[], config: SlopConfig): {
    slopScore: number;
    categories: CategoryResult[];
};
