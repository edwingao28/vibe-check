/**
 * Placeholder Content signal analyzer.
 *
 * Detects fake/placeholder data in text content — AI-generated projects
 * often have placeholder metrics ("10,000+", "$99.99/mo"), dummy names
 * ("John Doe", "Jane Smith"), and lorem ipsum text in dashboards and
 * landing pages.
 *
 * Scoring:
 *   Scans all TextFact[] for placeholder patterns across four categories:
 *   - Lorem ipsum (weight 5)
 *   - Fake names (weight 2)
 *   - Placeholder metrics (weight 1)
 *   - Generic placeholder text (weight 2)
 *
 *   score = clamp(totalWeightedHits / 15, 0, 1) — saturates at 15 weighted points.
 */

import type {
  SignalDefinition,
  SignalResult,
  SignalContext,
  SignalEvidence,
} from "./types.js";
import type { TextFact } from "../ir/types.js";
import {
  PLACEHOLDER_CATEGORIES,
  type PlaceholderCategory,
} from "./data/placeholders.js";

/** Score saturates when weighted hits reach this value. */
const SATURATION_THRESHOLD = 15;

interface CategoryMatch {
  category: PlaceholderCategory;
  matchCount: number;
  matchedPatterns: string[];
}

interface PagePlaceholderAnalysis {
  file: string;
  totalWeightedHits: number;
  categoryMatches: CategoryMatch[];
  score: number;
}

/**
 * Scan a set of text facts from one file for placeholder patterns.
 */
function analyzePage(file: string, texts: TextFact[]): PagePlaceholderAnalysis {
  const fullText = texts.map((t) => t.text).join(" ");

  let totalWeightedHits = 0;
  const categoryMatches: CategoryMatch[] = [];

  for (const category of PLACEHOLDER_CATEGORIES) {
    let matchCount = 0;
    const matchedPatterns: string[] = [];

    for (const pattern of category.patterns) {
      // Create a global version of the pattern for counting all matches
      const globalPattern = new RegExp(
        pattern.source,
        pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g",
      );
      const matches = fullText.match(globalPattern);
      if (matches && matches.length > 0) {
        matchCount += matches.length;
        matchedPatterns.push(matches[0]);
      }
    }

    if (matchCount > 0) {
      totalWeightedHits += category.weight * matchCount;
      categoryMatches.push({ category, matchCount, matchedPatterns });
    }
  }

  const score = Math.min(
    1,
    Math.max(0, totalWeightedHits / SATURATION_THRESHOLD),
  );

  return { file, totalWeightedHits, categoryMatches, score };
}

export const placeholderContent: SignalDefinition = {
  id: "placeholder-content",
  name: "Placeholder Content",
  category: "content",
  needs: ["tailwind", "inline"],
  attenuatable: false,

  analyze(ctx: SignalContext): SignalResult {
    const { texts } = ctx;

    if (texts.length === 0) {
      return {
        id: "placeholder-content",
        name: "Placeholder Content",
        category: "content",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "insufficient_data",
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
    const pageResults: PagePlaceholderAnalysis[] = [];
    for (const [file, fileFacts] of byFile) {
      pageResults.push(analyzePage(file, fileFacts));
    }

    // Overall score: take the worst (highest) page score
    const maxScore = Math.max(0, ...pageResults.map((p) => p.score));

    // Build evidence from flagged pages
    const evidence: SignalEvidence[] = [];
    for (const page of pageResults) {
      if (page.score > 0) {
        const parts: string[] = [];
        for (const cm of page.categoryMatches) {
          const samples = cm.matchedPatterns
            .slice(0, 3)
            .map((p) => `"${p}"`)
            .join(", ");
          parts.push(
            `${cm.category.label}: ${cm.matchCount} hit(s) [${samples}]`,
          );
        }

        evidence.push({
          summary: `Placeholder content in ${page.file} (weighted score: ${page.totalWeightedHits})`,
          files: [page.file],
          detail: parts.join("; "),
        });
      }
    }

    return {
      id: "placeholder-content",
      name: "Placeholder Content",
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

export default placeholderContent;
