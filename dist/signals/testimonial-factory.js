/**
 * Testimonial Factory signal analyzer.
 *
 * Detects generic, AI-generated testimonial sections with fake quotes
 * and attribution patterns. LLMs produce predictable testimonials like
 * "This product changed my life" with "John D., CEO at TechCorp".
 *
 * Detection:
 *   1. Look for testimonial-section StructuralFacts
 *   2. Scan TextFacts for generic praise phrases (tiered weights)
 *   3. Detect attribution patterns ("— Name, Title")
 *
 * Scoring:
 *   weightedHits / threshold, boosted if testimonial-section is present
 *   Only flags when weightedHits > 2 AND matchCount > 1
 */
import { TESTIMONIAL_PHRASES, ATTRIBUTION_PATTERNS } from "./data/testimonial-phrases.js";
import { clamp } from "./utils/math.js";
function analyzePage(file, texts, hasTestimonialSection) {
    let weightedHits = 0;
    let matchCount = 0;
    let hasAttribution = false;
    const matchedPhrases = [];
    const fullText = texts.map((t) => t.text).join(" ");
    // Check phrase patterns
    for (const [tierName, tier] of Object.entries(TESTIMONIAL_PHRASES)) {
        for (const pattern of tier.phrases) {
            const match = fullText.match(pattern);
            if (match) {
                weightedHits += tier.weight;
                matchCount++;
                matchedPhrases.push({
                    phrase: match[0],
                    tier: tierName,
                    text: match[0].slice(0, 60),
                });
            }
        }
    }
    // Check attribution patterns
    for (const pattern of ATTRIBUTION_PATTERNS) {
        if (pattern.test(fullText)) {
            hasAttribution = true;
            weightedHits += 2;
            matchCount++;
            break;
        }
    }
    // Scoring: weighted hits / 10, boosted if structural evidence exists
    let score = 0;
    if (weightedHits > 2 && matchCount > 1) {
        score = clamp(weightedHits / 10, 0, 1);
        // Boost if we have a testimonial section structure
        if (hasTestimonialSection) {
            score = clamp(score * 1.5, 0, 1);
        }
        // Boost if attribution pattern found alongside phrases
        if (hasAttribution && matchedPhrases.length > 0) {
            score = clamp(score * 1.3, 0, 1);
        }
    }
    return { file, weightedHits, matchCount, matchedPhrases, hasAttribution, hasTestimonialSection, score };
}
export const testimonialFactory = {
    id: "testimonial-factory",
    name: "Testimonial Factory",
    category: "content",
    needs: ["tailwind", "inline"],
    attenuatable: false,
    analyze(ctx) {
        const { texts, structures } = ctx;
        if (texts.length === 0) {
            return {
                id: "testimonial-factory",
                name: "Testimonial Factory",
                category: "content",
                score: 0,
                rawScore: 0,
                attenuatedScore: 0,
                status: "insufficient_data",
                confidence: "low",
                evidence: [],
            };
        }
        // Check which files have testimonial-section structural facts
        const testimonialFiles = new Set(structures
            .filter((s) => s.sectionType === "testimonial-section")
            .map((s) => s.file));
        // Group texts by file
        const byFile = new Map();
        for (const t of texts) {
            const arr = byFile.get(t.file) ?? [];
            arr.push(t);
            byFile.set(t.file, arr);
        }
        const pages = [];
        for (const [file, fileFacts] of byFile) {
            pages.push(analyzePage(file, fileFacts, testimonialFiles.has(file)));
        }
        const maxScore = Math.max(0, ...pages.map((p) => p.score));
        const evidence = [];
        for (const page of pages) {
            if (page.score > 0) {
                const phraseList = page.matchedPhrases
                    .slice(0, 5)
                    .map((p) => `"${p.text}" (${p.tier})`)
                    .join(", ");
                const parts = [];
                parts.push(`${page.matchCount} generic testimonial pattern(s)`);
                if (page.hasAttribution)
                    parts.push("fake attribution detected");
                if (page.hasTestimonialSection)
                    parts.push("testimonial section present");
                evidence.push({
                    summary: `${parts.join(", ")} in ${page.file}`,
                    files: [page.file],
                    detail: `Weighted score: ${page.weightedHits.toFixed(1)}. Matches: ${phraseList}.`,
                });
            }
        }
        return {
            id: "testimonial-factory",
            name: "Testimonial Factory",
            category: "content",
            score: maxScore,
            rawScore: maxScore,
            attenuatedScore: maxScore,
            status: "scored",
            confidence: "high",
            evidence,
        };
    },
};
export default testimonialFactory;
//# sourceMappingURL=testimonial-factory.js.map