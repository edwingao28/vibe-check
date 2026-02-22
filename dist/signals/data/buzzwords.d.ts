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
export declare const BUZZWORDS: Record<string, BuzzwordTier>;
export declare const PHRASE_PATTERNS: PhrasePattern[];
