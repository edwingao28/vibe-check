/**
 * Tiered buzzword lexicon and n-gram phrase patterns for Buzzword Bingo signal.
 *
 * Tier A (weight 3): Almost always slop — extremely generic corporate/tech jargon.
 * Tier B (weight 1): Context-dependent — could be legitimate in some domains.
 * Tier C (weight 0.5): Only slop in clusters — common adjectives that become suspicious
 *   when multiple appear together on the same page.
 *
 * Phrase patterns carry higher weights (3-5) because full cliche phrases are
 * stronger signals of AI-generated content than individual words.
 */

export interface BuzzwordTier {
  weight: number;
  words: string[];
}

export interface PhrasePattern {
  pattern: RegExp;
  weight: number;
}

export const BUZZWORDS: Record<string, BuzzwordTier> = {
  tierA: {
    weight: 3,
    words: [
      "synergy",
      "revolutionize",
      "game-changing",
      "next-generation",
      "paradigm shift",
      "disruptive",
      "best-in-class",
      "world-class",
      "turn-key",
      "bleeding-edge",
    ],
  },
  tierB: {
    weight: 1,
    words: [
      "leverage",
      "empower",
      "streamline",
      "cutting-edge",
      "solutions",
      "optimize",
      "transform",
      "elevate",
      "unlock",
      "supercharge",
    ],
  },
  tierC: {
    weight: 0.5,
    words: [
      "innovative",
      "seamless",
      "robust",
      "scalable",
      "dynamic",
      "powerful",
      "intuitive",
      "comprehensive",
      "flexible",
      "efficient",
    ],
  },
};

export const PHRASE_PATTERNS: PhrasePattern[] = [
  { pattern: /in today'?s (?:fast-paced|digital|modern|ever-changing) world/i, weight: 5 },
  { pattern: /whether you'?re a .+ or (?:a )?.+/i, weight: 4 },
  { pattern: /take your .+ to the next level/i, weight: 5 },
  { pattern: /designed with you in mind/i, weight: 5 },
  { pattern: /built for the modern .+/i, weight: 4 },
  { pattern: /everything you need to .+/i, weight: 3 },
  { pattern: /ready to (?:get started|transform|revolutionize|elevate)/i, weight: 4 },
  { pattern: /join (?:thousands|millions|hundreds) of .+ who/i, weight: 4 },
  { pattern: /it'?s (?:time to|never been easier)/i, weight: 3 },
  { pattern: /from .+ to .+,? we'?ve got you covered/i, weight: 5 },
];
