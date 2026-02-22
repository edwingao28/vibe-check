/**
 * Emoji Infestation signal analyzer.
 *
 * Detects overuse of emoji characters in text content — a hallmark of
 * AI-generated marketing copy. LLMs love to sprinkle emojis everywhere.
 *
 * Scoring:
 *   Any emoji presence triggers a non-zero score.
 *   score = min(1, emojiCount / 10) — saturates at 10 emojis per file.
 */

import type { SignalDefinition, SignalResult, SignalContext, SignalEvidence } from "./types.js";
import type { TextFact } from "../ir/types.js";

/**
 * Regex matching common emoji Unicode ranges.
 * Covers emoticons, symbols, transport, flags, and supplemental ranges.
 */
const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{2934}-\u{2935}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2614}-\u{2615}\u{2648}-\u{2653}\u{267F}\u{2693}\u{26A1}\u{26AA}-\u{26AB}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26CE}\u{26D4}\u{26EA}\u{26F2}-\u{26F3}\u{26F5}\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}]/gu;

/** Score scaling: score = min(1, emojiCount / SATURATION_COUNT) */
const SATURATION_COUNT = 10;

interface PageEmojiAnalysis {
  file: string;
  emojiCount: number;
  totalWords: number;
  density: number;
  distinctEmojis: Set<string>;
  score: number;
}

function analyzePage(file: string, texts: TextFact[]): PageEmojiAnalysis {
  let emojiCount = 0;
  let totalWords = 0;
  const distinctEmojis = new Set<string>();

  for (const t of texts) {
    const words = t.text.split(/\s+/).filter((w) => w.length > 0);
    totalWords += words.length;

    const emojis = t.text.match(EMOJI_REGEX);
    if (emojis) {
      emojiCount += emojis.length;
      for (const e of emojis) distinctEmojis.add(e);
    }
  }

  const density = totalWords > 0 ? emojiCount / totalWords : 0;

  // Any emoji presence triggers a score; more emojis = higher score
  const score = emojiCount > 0 ? Math.min(1, emojiCount / SATURATION_COUNT) : 0;

  return { file, emojiCount, totalWords, density, distinctEmojis, score };
}

export const emojiInfestation: SignalDefinition = {
  id: "emoji-infestation",
  name: "Emoji Infestation",
  category: "content",
  needs: ["tailwind", "inline"],
  attenuatable: false,

  analyze(ctx: SignalContext): SignalResult {
    const { texts } = ctx;

    if (texts.length === 0) {
      return {
        id: "emoji-infestation",
        name: "Emoji Infestation",
        category: "content",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "insufficient_data",
        confidence: "low",
        evidence: [],
      };
    }

    // Group by file
    const byFile = new Map<string, TextFact[]>();
    for (const t of texts) {
      const arr = byFile.get(t.file) ?? [];
      arr.push(t);
      byFile.set(t.file, arr);
    }

    const pages: PageEmojiAnalysis[] = [];
    for (const [file, fileFacts] of byFile) {
      pages.push(analyzePage(file, fileFacts));
    }

    const maxScore = Math.max(0, ...pages.map((p) => p.score));

    const evidence: SignalEvidence[] = [];
    for (const page of pages) {
      if (page.score > 0) {
        const emojiSample = [...page.distinctEmojis].slice(0, 10).join(" ");
        evidence.push({
          summary: `${page.emojiCount} emojis in ${page.file} (density: ${(page.density * 100).toFixed(1)}%)`,
          files: [page.file],
          detail: `${page.distinctEmojis.size} distinct emojis: ${emojiSample}. ` +
            `${page.totalWords} total words.`,
        });
      }
    }

    return {
      id: "emoji-infestation",
      name: "Emoji Infestation",
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

export default emojiInfestation;
