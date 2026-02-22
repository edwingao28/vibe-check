import type { StyleFact } from "../ir/types.js";
import type { IntentResult, IntentTier } from "./types.js";
/**
 * Returns true if `varName` matches a known framework-default CSS variable
 * pattern. These variables ship with popular UI frameworks and should not
 * be counted as evidence of custom design intent.
 */
export declare function isFrameworkDefault(varName: string): boolean;
/**
 * Calculates the intent score from IR evidence.
 *
 * The intent score measures evidence of deliberate design decisions.
 * It is reported alongside (not instead of) the slop score.
 *
 * Contributing signals (from SPEC section 5.1):
 *   - CSS custom properties (--*): 2 per var, capped at 30
 *   - Design token files: 15 per file, capped at 30
 *   - Consistent naming conventions in CSS vars: 10 if consistent --prefix-* pattern
 *   - Distinct font-family values (>1 = custom fonts): 5 per font after first, cap 15
 *   - Style guide detection: 5 if STYLE_GUIDE.md or design-system/ found
 *
 * Total capped at 100.
 *
 * Tier derivation (SPEC section 5.2):
 *   0-20   -> "None"
 *   21-55  -> "Partial"
 *   56-100 -> "Full"
 */
export declare function calculateIntent(facts: StyleFact[], fileList: string[]): IntentResult;
/**
 * Derives the intent tier from a raw intent score.
 *
 * SPEC section 5.2:
 *   0-20  -> "None"
 *   21-55 -> "Partial"
 *   56-100 -> "Full"
 */
export declare function deriveTier(score: number): IntentTier;
