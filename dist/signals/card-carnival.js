/**
 * Card Carnival signal analyzer.
 *
 * Detects excessive repetition of card components — a classic AI pattern
 * where 3-6+ identical cards (icon + heading + description) are generated
 * in a grid layout.
 *
 * Detection approach:
 *   1. Count heading+paragraph pairs in close proximity (card fingerprints)
 *   2. Check for feature-grid structural sections
 *   3. Measure structural uniformity of repeated groups
 *
 * Scoring:
 *   Based on card-cluster count per file:
 *   3 cards = 0.3, 4-5 = 0.5, 6-8 = 0.7, 9+ = 1.0
 *   Boosted if feature-grid section is present.
 */
import { clamp } from "./utils/math.js";
/** Maximum line gap between a heading and its paired paragraph */
const PAIR_LINE_GAP = 15;
/** Maximum line gap between card groups to be considered a cluster */
const CLUSTER_LINE_GAP = 50;
/**
 * Find heading+paragraph pairs that indicate card-like structures.
 * A "pair" is a heading TextFact followed by a paragraph TextFact within PAIR_LINE_GAP lines.
 */
function findCardPairs(texts) {
    const headings = texts
        .filter((t) => t.context === "heading")
        .sort((a, b) => a.line - b.line);
    const paragraphs = texts
        .filter((t) => t.context === "paragraph")
        .sort((a, b) => a.line - b.line);
    const pairs = [];
    const usedParagraphs = new Set();
    for (const h of headings) {
        // Find the closest paragraph after this heading within the gap
        for (let i = 0; i < paragraphs.length; i++) {
            if (usedParagraphs.has(i))
                continue;
            const p = paragraphs[i];
            const gap = p.line - h.line;
            if (gap >= 0 && gap <= PAIR_LINE_GAP) {
                pairs.push({
                    headingLine: h.line,
                    paragraphLine: p.line,
                    heading: h.text,
                    paragraph: p.text,
                });
                usedParagraphs.add(i);
                break;
            }
        }
    }
    return pairs;
}
/**
 * Alternative detection: find clusters of short text elements that suggest
 * repeated card-like components. When headings are not properly tagged
 * (common in JSX with dynamic rendering), look for runs of short text
 * followed by longer text within proximity.
 *
 * A "pseudo-card" is a short text (<=8 words, likely a title) followed
 * by a longer text (>8 words, likely a description) within PAIR_LINE_GAP lines.
 */
function findPseudoCardPairs(texts) {
    // Get all texts that could be card titles or descriptions
    const candidates = texts
        .filter((t) => t.context !== "button" && t.context !== "link")
        .sort((a, b) => a.line - b.line);
    const pairs = [];
    const used = new Set();
    for (let i = 0; i < candidates.length; i++) {
        if (used.has(i))
            continue;
        const title = candidates[i];
        const titleWords = title.text.trim().split(/\s+/).length;
        // Short text (1-8 words) is a potential card title
        if (titleWords > 8)
            continue;
        // Look for a longer description text nearby
        for (let j = i + 1; j < candidates.length; j++) {
            if (used.has(j))
                continue;
            const desc = candidates[j];
            const gap = desc.line - title.line;
            if (gap > PAIR_LINE_GAP)
                break;
            const descWords = desc.text.trim().split(/\s+/).length;
            if (descWords > 8) {
                pairs.push({
                    headingLine: title.line,
                    paragraphLine: desc.line,
                    heading: title.text,
                    paragraph: desc.text,
                });
                used.add(i);
                used.add(j);
                break;
            }
        }
    }
    return pairs;
}
/**
 * Group heading+paragraph pairs into clusters (cards that appear together).
 * Pairs within CLUSTER_LINE_GAP of each other belong to the same cluster.
 */
function clusterPairs(pairs) {
    if (pairs.length === 0)
        return [];
    const sorted = [...pairs].sort((a, b) => a.headingLine - b.headingLine);
    const clusters = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (curr.headingLine - prev.headingLine <= CLUSTER_LINE_GAP) {
            clusters[clusters.length - 1].push(curr);
        }
        else {
            clusters.push([curr]);
        }
    }
    return clusters;
}
/**
 * Score a card cluster based on size.
 */
function scoreCluster(cardCount) {
    if (cardCount >= 9)
        return 1.0;
    if (cardCount >= 6)
        return 0.7;
    if (cardCount >= 4)
        return 0.5;
    if (cardCount >= 3)
        return 0.3;
    return 0;
}
export const cardCarnival = {
    id: "card-carnival",
    name: "Card Carnival",
    category: "structure",
    needs: ["tailwind", "inline"],
    attenuatable: false,
    analyze(ctx) {
        const { texts, structures } = ctx;
        if (texts.length === 0 && structures.length === 0) {
            return {
                id: "card-carnival",
                name: "Card Carnival",
                category: "structure",
                score: 0,
                rawScore: 0,
                attenuatedScore: 0,
                status: "insufficient_data",
                confidence: "low",
                evidence: [],
            };
        }
        // Check which files have feature-grid sections
        const featureGridFiles = new Set(structures
            .filter((s) => s.sectionType === "feature-grid")
            .map((s) => s.file));
        // Group texts by file
        const byFile = new Map();
        for (const t of texts) {
            const arr = byFile.get(t.file) ?? [];
            arr.push(t);
            byFile.set(t.file, arr);
        }
        const allClusters = [];
        for (const [file, fileFacts] of byFile) {
            // Try heading+paragraph pairs first; fall back to pseudo-card detection
            let pairs = findCardPairs(fileFacts);
            if (pairs.length < 3) {
                // Not enough formal heading+paragraph pairs found;
                // try pseudo-card detection for JSX with untagged headings
                const pseudoPairs = findPseudoCardPairs(fileFacts);
                if (pseudoPairs.length > pairs.length) {
                    pairs = pseudoPairs;
                }
            }
            const clusters = clusterPairs(pairs);
            for (const cluster of clusters) {
                if (cluster.length >= 3) {
                    allClusters.push({
                        file,
                        cardCount: cluster.length,
                        startLine: cluster[0].headingLine,
                        endLine: cluster[cluster.length - 1].paragraphLine,
                        hasFeatureGridSection: featureGridFiles.has(file),
                    });
                }
            }
        }
        if (allClusters.length === 0) {
            return {
                id: "card-carnival",
                name: "Card Carnival",
                category: "structure",
                score: 0,
                rawScore: 0,
                attenuatedScore: 0,
                status: "scored",
                confidence: texts.length > 0 ? "high" : "low",
                evidence: [],
            };
        }
        // Score: take the worst cluster
        let maxScore = 0;
        for (const cluster of allClusters) {
            let score = scoreCluster(cluster.cardCount);
            // Boost if feature-grid section is present in same file
            if (cluster.hasFeatureGridSection) {
                score = clamp(score * 1.3, 0, 1);
            }
            maxScore = Math.max(maxScore, score);
        }
        const evidence = [];
        for (const cluster of allClusters) {
            if (scoreCluster(cluster.cardCount) > 0) {
                evidence.push({
                    summary: `${cluster.cardCount} repeated card pattern at lines ${cluster.startLine}-${cluster.endLine} in ${cluster.file}`,
                    files: [`${cluster.file}:${cluster.startLine}`],
                    detail: cluster.hasFeatureGridSection
                        ? "Card cluster inside a feature-grid section — typical AI-generated pattern"
                        : `${cluster.cardCount} heading+paragraph pairs in close proximity suggest a repeated card layout`,
                });
            }
        }
        return {
            id: "card-carnival",
            name: "Card Carnival",
            category: "structure",
            score: maxScore,
            rawScore: maxScore,
            attenuatedScore: maxScore,
            status: "scored",
            confidence: "high",
            evidence,
        };
    },
};
export default cardCarnival;
//# sourceMappingURL=card-carnival.js.map