/**
 * CTA Mania signal analyzer.
 *
 * Detects excessive call-to-action elements on individual pages.
 * AI-generated landing pages often pack 5-8+ CTA buttons onto a single
 * page, which is a strong signal of template-driven design.
 *
 * Scoring:
 *   Count TextFact[] where context === "button" or "link" per file.
 *   Skip nav links (links appearing very early in the file, likely navigation).
 *   Score for worst page: min(1, (ctaCount - 3) / 5)
 *   Pages with <= 3 CTAs are considered normal.
 */

import type { SignalDefinition, SignalResult, SignalContext, SignalEvidence } from "./types.js";
import type { TextFact } from "../ir/types.js";
import { clamp } from "./utils/math.js";

/**
 * Common navigation link texts that should be excluded from CTA counting.
 */
const NAV_LINK_PATTERNS = [
  /^home$/i,
  /^about$/i,
  /^contact$/i,
  /^blog$/i,
  /^docs$/i,
  /^faq$/i,
  /^pricing$/i,
  /^features$/i,
  /^login$/i,
  /^sign in$/i,
  /^menu$/i,
  /^nav$/i,
];

/**
 * Determine if a TextFact is likely a navigation link rather than a CTA.
 * Navigation links are typically short, generic, and appear within nav elements.
 */
function isNavLink(fact: TextFact): boolean {
  // Check if the text matches common nav link patterns
  const trimmed = fact.text.trim();
  if (trimmed.length === 0) return true;

  for (const pattern of NAV_LINK_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  return false;
}

/**
 * Count CTA elements (buttons + non-nav links) per file.
 */
function countCtasPerFile(texts: TextFact[]): Map<string, { count: number; ctas: TextFact[] }> {
  const byFile = new Map<string, { count: number; ctas: TextFact[] }>();

  for (const t of texts) {
    if (t.context !== "button" && t.context !== "link") continue;

    // Skip nav links
    if (t.context === "link" && isNavLink(t)) continue;

    const entry = byFile.get(t.file) ?? { count: 0, ctas: [] };
    entry.count++;
    entry.ctas.push(t);
    byFile.set(t.file, entry);
  }

  return byFile;
}

export const ctaMania: SignalDefinition = {
  id: "cta-mania",
  name: "CTA Mania",
  category: "structure",
  needs: ["tailwind", "inline"],
  attenuatable: false,

  analyze(ctx: SignalContext): SignalResult {
    const { texts } = ctx;

    if (texts.length === 0) {
      return {
        id: "cta-mania",
        name: "CTA Mania",
        category: "structure",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "scored",
        confidence: "low",
        evidence: [],
      };
    }

    const ctasByFile = countCtasPerFile(texts);

    if (ctasByFile.size === 0) {
      return {
        id: "cta-mania",
        name: "CTA Mania",
        category: "structure",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "scored",
        confidence: "high",
        evidence: [],
      };
    }

    // Find the worst page (highest CTA count)
    let worstFile = "";
    let worstCount = 0;
    for (const [file, { count }] of ctasByFile) {
      if (count > worstCount) {
        worstCount = count;
        worstFile = file;
      }
    }

    // Score for worst page: min(1, (ctaCount - 3) / 5)
    const rawScore = clamp((worstCount - 3) / 5, 0, 1);

    // Build evidence
    const evidence: SignalEvidence[] = [];

    // Report pages with > 3 CTAs
    const flaggedPages = [...ctasByFile.entries()]
      .filter(([, { count }]) => count > 3)
      .sort(([, a], [, b]) => b.count - a.count);

    for (const [file, { count, ctas }] of flaggedPages) {
      const ctaLabels = ctas
        .slice(0, 5)
        .map((c) => `"${c.text.slice(0, 30)}"`)
        .join(", ");

      evidence.push({
        summary: `${count} CTA elements on ${file}`,
        files: [file],
        detail: `CTA labels: ${ctaLabels}${ctas.length > 5 ? ` (+${ctas.length - 5} more)` : ""}`,
      });
    }

    return {
      id: "cta-mania",
      name: "CTA Mania",
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

export default ctaMania;
