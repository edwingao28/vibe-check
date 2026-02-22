/**
 * Whitespace Wasteland signal analyzer.
 *
 * Detects monotonous spacing by measuring the diversity of spacing values.
 * AI-generated sites often repeat the same 2-3 spacing values (e.g., p-4, m-8)
 * everywhere, resulting in low entropy and a low unique ratio.
 *
 * Score: `1 - (normalizedEntropy * 0.6 + uniqueRatio * 0.4)`
 *   - Low entropy + low unique ratio = high score (monotonous)
 *   - High entropy + high unique ratio = low score (varied)
 *
 * Category: spacing-effects
 * Needs: ["css", "tailwind"]
 * Attenuatable: no (entropy signals remain at full weight)
 */
import { shannonEntropy, normalizeEntropy, uniqueRatio as computeUniqueRatio, clamp } from "./utils/math.js";
/** Properties considered as spacing */
const SPACING_PROPERTIES = new Set([
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "margin-inline",
    "margin-block",
    "margin-inline-start",
    "margin-inline-end",
    "margin-block-start",
    "margin-block-end",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "padding-inline",
    "padding-block",
    "padding-inline-start",
    "padding-inline-end",
    "padding-block-start",
    "padding-block-end",
    "gap",
    "row-gap",
    "column-gap",
]);
function isSpacingProperty(property) {
    return SPACING_PROPERTIES.has(property);
}
function analyze(ctx) {
    const spacingFacts = ctx.facts.filter((f) => isSpacingProperty(f.property));
    if (spacingFacts.length === 0) {
        return {
            id: "whitespace-wasteland",
            name: "Whitespace Wasteland",
            category: "spacing-effects",
            score: 0,
            rawScore: 0,
            attenuatedScore: 0,
            status: "scored",
            confidence: "high",
            evidence: [
                {
                    summary: "No spacing declarations found",
                    files: [],
                },
            ],
        };
    }
    // Extract normalized spacing values
    const values = spacingFacts.map((f) => f.value.toLowerCase().trim());
    const entropy = shannonEntropy(values);
    const distinctCount = new Set(values).size;
    const normEntropy = normalizeEntropy(entropy, distinctCount);
    const uRatio = computeUniqueRatio(values);
    const rawScore = clamp(1 - (normEntropy * 0.6 + uRatio * 0.4), 0, 1);
    const uniqueValues = new Set(values);
    return {
        id: "whitespace-wasteland",
        name: "Whitespace Wasteland",
        category: "spacing-effects",
        score: rawScore,
        rawScore,
        attenuatedScore: rawScore,
        status: "scored",
        confidence: "high",
        evidence: [
            {
                summary: `Spacing entropy ${entropy.toFixed(2)} (normalized: ${normEntropy.toFixed(2)}); ${uniqueValues.size} unique values in ${values.length} declarations`,
                files: spacingFacts.slice(0, 5).map((f) => `${f.file}:${f.line}`),
                detail: `Unique values: ${Array.from(uniqueValues).slice(0, 8).join(", ")}`,
            },
        ],
    };
}
export const whitespaceWasteland = {
    id: "whitespace-wasteland",
    name: "Whitespace Wasteland",
    category: "spacing-effects",
    needs: ["css", "tailwind"],
    attenuatable: false,
    analyze,
};
//# sourceMappingURL=whitespace-wasteland.js.map