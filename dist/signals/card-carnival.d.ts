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
import type { SignalDefinition } from "./types.js";
export declare const cardCarnival: SignalDefinition;
export default cardCarnival;
