/**
 * Buzzword Bingo signal analyzer.
 *
 * Detects AI-generated marketing copy by scanning text content for
 * tiered buzzwords and cliche phrases. Uses weighted density scoring
 * to distinguish genuine use of common words from suspicious clusters
 * of corporate jargon.
 *
 * Scoring formula:
 *   weighted density = sum(tier_weight * match_count) / (totalWords / 100)
 *   variety = count distinct buzzwords found
 *   co-occurrence = distinct tiers present on same page
 *   score = min(1, density * 0.5 + variety/20 * 0.3 + coOccurrence/3 * 0.2)
 *
 * Only flags when density > 2 AND variety > 3.
 */

import type { SignalDefinition, SignalResult, SignalContext, SignalEvidence } from "./types.js";
import type { TextFact } from "../ir/types.js";
import { BUZZWORDS, PHRASE_PATTERNS } from "./data/buzzwords.js";

interface PageBuzzwordAnalysis {
  file: string;
  weightedDensity: number;
  variety: number;
  coOccurrence: number;
  totalWords: number;
  matchedWords: Map<string, { count: number; tier: string }>;
  matchedPhrases: Map<string, { count: number; weight: number }>;
  score: number;
}

/**
 * Count total words in a set of text facts.
 */
function countWords(texts: TextFact[]): number {
  let total = 0;
  for (const t of texts) {
    // Split on whitespace and filter out empty strings
    const words = t.text.split(/\s+/).filter((w) => w.length > 0);
    total += words.length;
  }
  return total;
}

/**
 * Concatenate all text content from TextFacts into a single string for phrase matching.
 */
function concatenateText(texts: TextFact[]): string {
  return texts.map((t) => t.text).join(" ");
}

/**
 * Analyze buzzword density for a single page (group of text facts from same file).
 */
function analyzePage(file: string, texts: TextFact[]): PageBuzzwordAnalysis {
  const totalWords = countWords(texts);
  const fullText = concatenateText(texts);
  const lowerText = fullText.toLowerCase();

  const matchedWords = new Map<string, { count: number; tier: string }>();
  const tiersPresent = new Set<string>();
  let weightedSum = 0;

  // Check each tier's words
  for (const [tierName, tier] of Object.entries(BUZZWORDS)) {
    for (const word of tier.words) {
      const lowerWord = word.toLowerCase();
      // Use word boundary matching to avoid partial matches
      // Escape special regex characters in the word
      const escaped = lowerWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Use \b for word boundary, but also handle hyphenated words
      const regex = new RegExp(`\\b${escaped}\\b`, "gi");
      const matches = lowerText.match(regex);
      if (matches && matches.length > 0) {
        matchedWords.set(word, { count: matches.length, tier: tierName });
        tiersPresent.add(tierName);
        weightedSum += tier.weight * matches.length;
      }
    }
  }

  // Check phrase patterns
  const matchedPhrases = new Map<string, { count: number; weight: number }>();
  for (const { pattern, weight } of PHRASE_PATTERNS) {
    const matches = fullText.match(new RegExp(pattern.source, pattern.flags + (pattern.flags.includes("g") ? "" : "g")));
    if (matches && matches.length > 0) {
      matchedPhrases.set(pattern.source, { count: matches.length, weight });
      weightedSum += weight * matches.length;
    }
  }

  // Compute metrics
  const density = totalWords > 0 ? weightedSum / (totalWords / 100) : 0;
  const variety = matchedWords.size + matchedPhrases.size;
  const coOccurrence = tiersPresent.size;

  // Score formula: min(1, density * 0.5 + variety/20 * 0.3 + coOccurrence/3 * 0.2)
  let score = density * 0.5 + (variety / 20) * 0.3 + (coOccurrence / 3) * 0.2;
  score = Math.min(1, score);

  // Only flag when density > 2 AND variety > 3
  if (density <= 2 || variety <= 3) {
    score = 0;
  }

  return {
    file,
    weightedDensity: density,
    variety,
    coOccurrence,
    totalWords,
    matchedWords,
    matchedPhrases,
    score,
  };
}

export const buzzwordBingo: SignalDefinition = {
  id: "buzzword-bingo",
  name: "Buzzword Bingo",
  category: "content",
  needs: ["css", "tailwind", "inline"],
  attenuatable: false,

  analyze(ctx: SignalContext): SignalResult {
    const { texts } = ctx;

    if (texts.length === 0) {
      return {
        id: "buzzword-bingo",
        name: "Buzzword Bingo",
        category: "content",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "scored",
        confidence: "low",
        evidence: [],
      };
    }

    // Group TextFacts by file
    const byFile = new Map<string, TextFact[]>();
    for (const t of texts) {
      const arr = byFile.get(t.file) ?? [];
      arr.push(t);
      byFile.set(t.file, arr);
    }

    // Analyze each page
    const pageResults: PageBuzzwordAnalysis[] = [];
    for (const [file, fileFacts] of byFile) {
      pageResults.push(analyzePage(file, fileFacts));
    }

    // Overall score: take the worst (highest) page score
    const maxScore = Math.max(0, ...pageResults.map((p) => p.score));

    // Build evidence from flagged pages
    const evidence: SignalEvidence[] = [];
    for (const page of pageResults) {
      if (page.score > 0) {
        const topWords: string[] = [];
        for (const [word, info] of page.matchedWords) {
          topWords.push(`"${word}" (${info.tier}, ${info.count}x)`);
        }
        const topPhrases: string[] = [];
        for (const [, info] of page.matchedPhrases) {
          topPhrases.push(`phrase pattern (${info.count}x, weight ${info.weight})`);
        }

        const parts = [...topWords.slice(0, 5), ...topPhrases.slice(0, 3)];

        evidence.push({
          summary: `${page.variety} buzzwords/phrases in ${page.file} (density: ${page.weightedDensity.toFixed(1)})`,
          files: [page.file],
          detail: `Matches: ${parts.join(", ")}. ` +
            `Tiers present: ${page.coOccurrence}/3. ` +
            `Total words: ${page.totalWords}.`,
        });
      }
    }

    return {
      id: "buzzword-bingo",
      name: "Buzzword Bingo",
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

export default buzzwordBingo;
