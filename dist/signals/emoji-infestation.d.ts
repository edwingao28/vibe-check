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
import type { SignalDefinition } from "./types.js";
export declare const emojiInfestation: SignalDefinition;
export default emojiInfestation;
