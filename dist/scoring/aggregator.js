import { CATEGORIES } from "./categories.js";
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
export function aggregate(signals, config) {
    const signalMap = new Map();
    for (const signal of signals) {
        signalMap.set(signal.id, signal);
    }
    const categoryResults = [];
    for (const category of CATEGORIES) {
        // Collect signals belonging to this category
        const categorySignals = category.signalIds
            .map((id) => signalMap.get(id))
            .filter((s) => s !== undefined);
        // Count how many are insufficient
        const totalExpected = category.signalIds.length;
        const insufficientCount = categorySignals.filter((s) => s.status === "insufficient_data").length;
        // Also count signals not found (not present in signal results at all)
        const missingCount = totalExpected - categorySignals.length;
        const unavailableCount = insufficientCount + missingCount;
        // If >50% of signals in category are insufficient/missing, exclude
        if (unavailableCount > totalExpected * 0.5) {
            categoryResults.push({
                id: category.id,
                name: category.name,
                score: NaN,
                signals: category.signalIds,
            });
            continue;
        }
        // Filter to only scored signals for power mean calculation
        const scoredSignals = categorySignals.filter((s) => s.status === "scored");
        if (scoredSignals.length === 0) {
            categoryResults.push({
                id: category.id,
                name: category.name,
                score: 0,
                signals: category.signalIds,
            });
            continue;
        }
        // Power mean with p=2:
        // C_k = sqrt( sum(w_i * s_i^2) / sum(w_i) )
        // where w_i = 1 for all signals
        const sumSquared = scoredSignals.reduce((sum, s) => sum + s.attenuatedScore * s.attenuatedScore, 0);
        const sumWeights = scoredSignals.length; // w_i = 1
        const categoryScore = Math.sqrt(sumSquared / sumWeights);
        categoryResults.push({
            id: category.id,
            name: category.name,
            score: categoryScore,
            signals: category.signalIds,
        });
    }
    // Overall: slopScore = 100 * sum(W_k * C_k) / sum(W_k)
    // Only include categories with valid (non-NaN) scores
    let weightedSum = 0;
    let totalWeight = 0;
    for (const catResult of categoryResults) {
        if (Number.isNaN(catResult.score))
            continue;
        // Look up category weight: config override first, then default
        const categoryDef = CATEGORIES.find((c) => c.id === catResult.id);
        const configWeight = config.signals.categoryWeights[catResult.id];
        const weight = configWeight ?? categoryDef?.weight ?? 1.0;
        weightedSum += weight * catResult.score;
        totalWeight += weight;
    }
    const rawOverall = totalWeight > 0 ? (100 * weightedSum) / totalWeight : 0;
    const slopScore = Math.max(0, Math.min(100, rawOverall));
    return { slopScore, categories: categoryResults };
}
//# sourceMappingURL=aggregator.js.map