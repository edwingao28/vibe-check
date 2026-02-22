/**
 * Hero Syndrome signal analyzer.
 *
 * Detects the classic AI-generated hero section pattern:
 * one heading + one paragraph + one CTA button — the universal
 * template for slop landing pages.
 *
 * Primary path: examine StructuralFact[] for hero sections and correlate
 * with TextFact[] to check the 1h+1p+1btn template pattern.
 *
 * Fallback: if no StructuralFacts are available, scan TextFact[] directly
 * for h1+p+button patterns in the first 50 lines of each page file.
 */

import type { SignalDefinition, SignalResult, SignalContext, SignalEvidence } from "./types.js";
import type { StructuralFact, TextFact } from "../ir/types.js";

const LINE_THRESHOLD = 50;

interface HeroAnalysis {
  file: string;
  hasHeading: boolean;
  hasParagraph: boolean;
  hasButton: boolean;
  headingCount: number;
  paragraphCount: number;
  buttonCount: number;
}

/**
 * Check whether a StructuralFact represents a hero section.
 * A section is a "hero" if its sectionType is explicitly "hero",
 * or if it is the first section in its file.
 */
function isHeroSection(fact: StructuralFact, allFacts: StructuralFact[]): boolean {
  if (fact.sectionType === "hero") return true;

  // Check if this is the first section in its file
  const fileFacts = allFacts.filter((f) => f.file === fact.file);
  if (fileFacts.length > 0 && fileFacts[0] === fact) return true;

  return false;
}

/**
 * Analyze hero sections using StructuralFacts + correlated TextFacts.
 */
function analyzeWithStructure(
  structures: StructuralFact[],
  texts: TextFact[],
): HeroAnalysis[] {
  const heroSections = structures.filter((s) => isHeroSection(s, structures));
  if (heroSections.length === 0) return [];

  const results: HeroAnalysis[] = [];

  for (const hero of heroSections) {
    // Find TextFacts associated with this hero section's file,
    // near the hero's line number (within a reasonable range)
    const heroTexts = texts.filter(
      (t) => t.file === hero.file && t.line >= hero.line && t.line <= hero.line + LINE_THRESHOLD,
    );

    const headings = heroTexts.filter((t) => t.context === "heading");
    const paragraphs = heroTexts.filter((t) => t.context === "paragraph");
    const buttons = heroTexts.filter((t) => t.context === "button");

    results.push({
      file: hero.file,
      hasHeading: headings.length > 0,
      hasParagraph: paragraphs.length > 0,
      hasButton: buttons.length > 0,
      headingCount: headings.length,
      paragraphCount: paragraphs.length,
      buttonCount: buttons.length,
    });
  }

  return results;
}

/**
 * Fallback: analyze TextFacts directly when no StructuralFacts are available.
 * Looks for h1+p+button pattern in the first 50 lines of each unique page file.
 */
function analyzeWithTextOnly(texts: TextFact[]): HeroAnalysis[] {
  // Group texts by file
  const byFile = new Map<string, TextFact[]>();
  for (const t of texts) {
    const arr = byFile.get(t.file) ?? [];
    arr.push(t);
    byFile.set(t.file, arr);
  }

  const results: HeroAnalysis[] = [];

  for (const [file, fileFacts] of byFile) {
    // Only look at facts in the first 50 lines
    const earlyFacts = fileFacts.filter((f) => f.line <= LINE_THRESHOLD);
    if (earlyFacts.length === 0) continue;

    const headings = earlyFacts.filter((t) => t.context === "heading");
    const paragraphs = earlyFacts.filter((t) => t.context === "paragraph");
    const buttons = earlyFacts.filter((t) => t.context === "button");

    results.push({
      file,
      hasHeading: headings.length > 0,
      hasParagraph: paragraphs.length > 0,
      hasButton: buttons.length > 0,
      headingCount: headings.length,
      paragraphCount: paragraphs.length,
      buttonCount: buttons.length,
    });
  }

  return results;
}

/**
 * Score a single hero analysis.
 * 1.0 = exact template match (exactly 1 heading + 1 paragraph + 1 button)
 * 0.5 = partial match (has heading + button but missing paragraph, or other partial combos)
 * 0.0 = no hero pattern detected
 */
function scoreHeroAnalysis(analysis: HeroAnalysis): number {
  const { hasHeading, hasParagraph, hasButton, headingCount, paragraphCount, buttonCount } = analysis;

  // Exact template match: exactly one of each
  if (hasHeading && hasParagraph && hasButton && headingCount === 1 && paragraphCount === 1 && buttonCount === 1) {
    return 1.0;
  }

  // Partial match: has at least 2 of the 3 components
  const componentCount = [hasHeading, hasParagraph, hasButton].filter(Boolean).length;
  if (componentCount >= 2) {
    return 0.5;
  }

  return 0.0;
}

export const heroSyndrome: SignalDefinition = {
  id: "hero-syndrome",
  name: "Hero Syndrome",
  category: "content",
  needs: ["tailwind", "inline"],
  attenuatable: false,

  analyze(ctx: SignalContext): SignalResult {
    const { structures, texts } = ctx;

    // No data at all — can't analyze
    if (texts.length === 0 && structures.length === 0) {
      return {
        id: "hero-syndrome",
        name: "Hero Syndrome",
        category: "content",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "insufficient_data",
        confidence: "low",
        evidence: [],
      };
    }

    // Determine which analysis path to use
    let analyses: HeroAnalysis[];
    if (structures.length > 0) {
      analyses = analyzeWithStructure(structures, texts);
      // If structural analysis found no hero sections, fall back to text-only
      if (analyses.length === 0) {
        analyses = analyzeWithTextOnly(texts);
      }
    } else {
      analyses = analyzeWithTextOnly(texts);
    }

    // No hero patterns found at all
    if (analyses.length === 0) {
      return {
        id: "hero-syndrome",
        name: "Hero Syndrome",
        category: "content",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "scored",
        confidence: texts.length > 0 ? "high" : "low",
        evidence: [],
      };
    }

    // Score: take the maximum score across all detected hero sections
    const scores = analyses.map((a) => scoreHeroAnalysis(a));
    const maxScore = Math.max(...scores);

    // Build evidence
    const evidence: SignalEvidence[] = [];
    for (let i = 0; i < analyses.length; i++) {
      const a = analyses[i];
      const s = scores[i];
      if (s > 0) {
        const parts: string[] = [];
        if (a.hasHeading) parts.push(`${a.headingCount} heading(s)`);
        if (a.hasParagraph) parts.push(`${a.paragraphCount} paragraph(s)`);
        if (a.hasButton) parts.push(`${a.buttonCount} button(s)`);

        evidence.push({
          summary: s === 1.0
            ? `Exact hero template: ${parts.join(" + ")} in ${a.file}`
            : `Partial hero pattern: ${parts.join(" + ")} in ${a.file}`,
          files: [a.file],
          detail: s === 1.0
            ? "Classic 1 heading + 1 paragraph + 1 CTA button hero section detected"
            : "Partial hero pattern — missing one component of the h1+p+button template",
        });
      }
    }

    return {
      id: "hero-syndrome",
      name: "Hero Syndrome",
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

export default heroSyndrome;
