/**
 * Whitespace Wasteland signal analyzer.
 *
 * Detects monotonous spacing by measuring the diversity of spacing values.
 * AI-generated sites often repeat the same 2-3 spacing values (e.g., p-4, m-8)
 * everywhere, resulting in low entropy and a low unique ratio.
 *
 * Score: `1 - (normalizedEntropy * 0.6 + uniqueRatio * 0.4)`
 *   - Low entropy + low unique ratio = high score (monotonous)
 *   - High entropy + high unique ratio = low score (varied)
 *
 * Category: spacing-effects
 * Needs: ["css", "tailwind"]
 * Attenuatable: no (entropy signals remain at full weight)
 */
import type { SignalDefinition } from "./types.js";
export declare const whitespaceWasteland: SignalDefinition;
