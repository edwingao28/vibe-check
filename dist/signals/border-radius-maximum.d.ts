/**
 * Border Radius Maximum signal analyzer.
 *
 * Detects monotonous border-radius usage. AI-generated sites often use a single
 * radius value (e.g., rounded-lg / 0.5rem) for nearly every element.
 *
 * Score: `mostCommonRatio - 0.3` clamped to [0, 1]
 *   - If >70% of radius declarations use the same value, score is high
 *   - A varied distribution scores low
 *
 * Category: spacing-effects
 * Needs: ["css", "tailwind"]
 * Attenuatable: yes
 */
import type { SignalDefinition } from "./types.js";
export declare const borderRadiusMaximum: SignalDefinition;
