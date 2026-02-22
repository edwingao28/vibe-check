/**
 * Purple Plague signal analyzer.
 *
 * Detects over-reliance on purple hues, a hallmark of AI-generated designs.
 * Uses a hybrid approach: resolved colors are analyzed by hue distribution,
 * unresolved tokens contribute to tokenization ratio.
 *
 * Score factors:
 *   - purpleRatio * 0.6: fraction of chromatic colors in purple range (260-310 deg)
 *   - (1 - tokenRatio) * 0.2: low tokenization = less intentional design
 *   - lowVariance * 0.2: purple hues clustering = less variety
 *
 * Only triggers when purpleRatio > 0.3 AND >= 5 chromatic colors.
 *
 * Category: typography-color
 * Needs: ["css", "tailwind", "inline"]
 * Attenuatable: yes
 */
import { clamp } from "./utils/math.js";
/** Purple hue range in degrees */
const PURPLE_HUE_MIN = 260;
const PURPLE_HUE_MAX = 310;
/** Minimum saturation to be considered "chromatic" (not gray) */
const CHROMATIC_SATURATION_THRESHOLD = 10;
/** Minimum chromatic colors before the signal activates */
const MIN_CHROMATIC_COLORS = 5;
/** Minimum purple ratio before the signal triggers */
const PURPLE_RATIO_THRESHOLD = 0.3;
function isChromatic(hsl) {
    return hsl[1] >= CHROMATIC_SATURATION_THRESHOLD;
}
function isPurple(hue) {
    return hue >= PURPLE_HUE_MIN && hue <= PURPLE_HUE_MAX;
}
function analyze(ctx) {
    const insufficientResult = {
        id: "purple-plague",
        name: "Purple Plague",
        category: "typography-color",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "scored",
        confidence: "high",
        evidence: [],
    };
    // Only consider colors with resolved HSL and reasonable confidence
    const resolvedColors = ctx.colors.filter((c) => c.hsl !== undefined && c.confidence !== "low");
    // Filter chromatic colors (exclude grays)
    const chromaticColors = resolvedColors.filter((c) => isChromatic(c.hsl));
    if (chromaticColors.length < MIN_CHROMATIC_COLORS) {
        return {
            ...insufficientResult,
            evidence: [
                {
                    summary: `Only ${chromaticColors.length} chromatic colors found (need ${MIN_CHROMATIC_COLORS} to analyze)`,
                    files: [],
                },
            ],
        };
    }
    // Count purple vs total chromatic
    const purpleColors = chromaticColors.filter((c) => isPurple(c.hsl[0]));
    const purpleRatio = purpleColors.length / chromaticColors.length;
    if (purpleRatio <= PURPLE_RATIO_THRESHOLD) {
        return {
            ...insufficientResult,
            evidence: [
                {
                    summary: `Purple ratio ${(purpleRatio * 100).toFixed(0)}% is below threshold (${PURPLE_RATIO_THRESHOLD * 100}%)`,
                    files: [],
                },
            ],
        };
    }
    // Token ratio: colors that came from CSS vars / design tokens
    const tokenColors = ctx.colors.filter((c) => c.token !== undefined);
    const tokenRatio = ctx.colors.length > 0 ? tokenColors.length / ctx.colors.length : 0;
    // Hue variance among purple colors (low variance = all same shade = somewhat less bad)
    let lowVariance = 0;
    if (purpleColors.length > 1) {
        const hues = purpleColors.map((c) => c.hsl[0]);
        const mean = hues.reduce((s, h) => s + h, 0) / hues.length;
        const variance = hues.reduce((s, h) => s + (h - mean) ** 2, 0) / hues.length;
        // Normalize: variance of 0 (all same) = 1.0, variance of 625 (spread over 50 deg range) = 0
        const maxVariance = ((PURPLE_HUE_MAX - PURPLE_HUE_MIN) / 2) ** 2;
        lowVariance = clamp(1 - variance / maxVariance, 0, 1);
    }
    else {
        lowVariance = 1.0; // Single purple hue = lowest variance
    }
    const rawScore = clamp(purpleRatio * 0.6 + (1 - tokenRatio) * 0.2 + lowVariance * 0.2, 0, 1);
    const purpleFiles = purpleColors
        .slice(0, 10)
        .map((c) => `${c.file}:${c.line}`);
    return {
        id: "purple-plague",
        name: "Purple Plague",
        category: "typography-color",
        score: rawScore,
        rawScore,
        attenuatedScore: rawScore,
        status: "scored",
        confidence: "high",
        evidence: [
            {
                summary: `${purpleColors.length}/${chromaticColors.length} chromatic colors are purple (${(purpleRatio * 100).toFixed(0)}%)`,
                files: purpleFiles,
                detail: `Token ratio: ${(tokenRatio * 100).toFixed(0)}%, hue variance factor: ${lowVariance.toFixed(2)}`,
            },
        ],
    };
}
export const purplePlague = {
    id: "purple-plague",
    name: "Purple Plague",
    category: "typography-color",
    needs: ["css", "tailwind", "inline"],
    attenuatable: true,
    analyze,
};
//# sourceMappingURL=purple-plague.js.map