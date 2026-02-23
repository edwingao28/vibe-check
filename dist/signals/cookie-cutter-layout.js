/**
 * Cookie Cutter Layout signal analyzer.
 *
 * Detects when multiple pages share the same structural layout pattern,
 * suggesting template-driven design. Uses Jaccard similarity on page
 * fingerprints (ordered lists of section types).
 *
 * UI library component files (shadcn/ui, Radix, etc.) are filtered out
 * before comparison since their structure is library-determined.
 *
 * Scoring:
 *   fingerprint = ordered list of sectionType per page
 *   similarity = Jaccard similarity between fingerprint pairs
 *   score = avg pairwise similarity - 0.3 baseline, clamped [0,1]
 *   <2 pages => score 0
 */
import { clamp } from "./utils/math.js";
const BASELINE = 0.3;
/**
 * Known UI library component directory patterns.
 * Files in these directories are UI primitives (shadcn, Radix, etc.)
 * and should be excluded from layout similarity comparison because
 * their structure is determined by the library, not the developer.
 */
const UI_LIBRARY_PATTERNS = [
    /\/components\/ui\//i, // shadcn/ui default location
    /\/ui\/(?!pages|views|layouts)/i, // generic /ui/ dir (but not ui/pages etc.)
    /\/@radix-ui\//i, // Radix UI
    /(?:^|\/)node_modules\//i, // any node_modules
    /\/\.next\//i, // Next.js build output
    /\/\.nuxt\//i, // Nuxt build output
];
/**
 * Returns true if a file path matches a known UI library component pattern.
 * These files should be excluded from cookie-cutter layout detection.
 */
function isUILibraryFile(filePath) {
    return UI_LIBRARY_PATTERNS.some((pattern) => pattern.test(filePath));
}
/**
 * Generate a fingerprint for a page: an ordered list of section types.
 */
function generateFingerprint(structures) {
    // Sort by line number to preserve document order
    const sorted = [...structures].sort((a, b) => a.line - b.line);
    return sorted.map((s) => s.sectionType);
}
/**
 * Compute Jaccard similarity between two fingerprints.
 *
 * Jaccard treats each fingerprint as a multiset. We convert to a bag of
 * (sectionType, index) pairs to account for order and repetition.
 * For ordered comparison, we use a combination of element-level Jaccard
 * and positional matching.
 */
function jaccardSimilarity(a, b) {
    if (a.length === 0 && b.length === 0)
        return 1;
    if (a.length === 0 || b.length === 0)
        return 0;
    // Use multiset Jaccard: count occurrences of each type in each fingerprint
    const countsA = new Map();
    const countsB = new Map();
    for (const s of a)
        countsA.set(s, (countsA.get(s) ?? 0) + 1);
    for (const s of b)
        countsB.set(s, (countsB.get(s) ?? 0) + 1);
    // Union of all keys
    const allKeys = new Set([...countsA.keys(), ...countsB.keys()]);
    let intersection = 0;
    let union = 0;
    for (const key of allKeys) {
        const countA = countsA.get(key) ?? 0;
        const countB = countsB.get(key) ?? 0;
        intersection += Math.min(countA, countB);
        union += Math.max(countA, countB);
    }
    return union > 0 ? intersection / union : 0;
}
export const cookieCutterLayout = {
    id: "cookie-cutter-layout",
    name: "Cookie Cutter Layout",
    category: "structure",
    needs: ["tailwind", "inline"],
    attenuatable: false,
    analyze(ctx) {
        const { structures } = ctx;
        // Group structures by file, excluding UI library components
        const byFile = new Map();
        let filteredFileCount = 0;
        for (const s of structures) {
            if (isUILibraryFile(s.file)) {
                filteredFileCount++;
                continue;
            }
            const arr = byFile.get(s.file) ?? [];
            arr.push(s);
            byFile.set(s.file, arr);
        }
        const files = [...byFile.keys()];
        // No structural data at all — can't analyze
        if (structures.length === 0) {
            return {
                id: "cookie-cutter-layout",
                name: "Cookie Cutter Layout",
                category: "structure",
                score: 0,
                rawScore: 0,
                attenuatedScore: 0,
                status: "insufficient_data",
                confidence: "low",
                evidence: [],
            };
        }
        // Need at least 2 pages to compare
        if (files.length < 2) {
            return {
                id: "cookie-cutter-layout",
                name: "Cookie Cutter Layout",
                category: "structure",
                score: 0,
                rawScore: 0,
                attenuatedScore: 0,
                status: "scored",
                confidence: "high",
                evidence: [],
            };
        }
        // Generate fingerprint per page
        const fingerprints = new Map();
        for (const [file, fileFacts] of byFile) {
            fingerprints.set(file, generateFingerprint(fileFacts));
        }
        // Compute pairwise Jaccard similarities
        const similarities = [];
        const pairDetails = [];
        for (let i = 0; i < files.length; i++) {
            for (let j = i + 1; j < files.length; j++) {
                const fpA = fingerprints.get(files[i]);
                const fpB = fingerprints.get(files[j]);
                const sim = jaccardSimilarity(fpA, fpB);
                similarities.push(sim);
                pairDetails.push({ fileA: files[i], fileB: files[j], similarity: sim });
            }
        }
        // Average pairwise similarity minus baseline, clamped [0, 1]
        const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
        const rawScore = clamp(avgSimilarity - BASELINE, 0, 1);
        // Build evidence
        const evidence = [];
        // Sort pairs by similarity (highest first) for evidence
        const topPairs = pairDetails
            .filter((p) => p.similarity > BASELINE)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5);
        if (topPairs.length > 0) {
            const pairDescriptions = topPairs
                .map((p) => `${p.fileA} <-> ${p.fileB}: ${(p.similarity * 100).toFixed(0)}%`)
                .join("; ");
            evidence.push({
                summary: `${files.length} pages with avg ${(avgSimilarity * 100).toFixed(0)}% structural similarity`,
                files: files,
                detail: `Most similar pairs: ${pairDescriptions}. ` +
                    `Fingerprints: ${[...fingerprints.entries()]
                        .map(([f, fp]) => `${f}: [${fp.join(", ")}]`)
                        .join("; ")}`,
            });
        }
        if (filteredFileCount > 0) {
            evidence.push({
                summary: `${filteredFileCount} UI library component structures excluded from comparison`,
                files: [],
                detail: "shadcn/ui and framework component files are excluded because their structure is library-determined, not developer-created",
            });
        }
        return {
            id: "cookie-cutter-layout",
            name: "Cookie Cutter Layout",
            category: "structure",
            score: rawScore,
            rawScore,
            attenuatedScore: rawScore,
            status: "scored",
            confidence: "high",
            evidence,
        };
    },
};
export default cookieCutterLayout;
//# sourceMappingURL=cookie-cutter-layout.js.map