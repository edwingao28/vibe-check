/**
 * Parse slop-ignore suppression comments from source code.
 *
 * Supported formats:
 *   CSS:  /* slop-ignore: signal-1, signal-2 * /
 *   JS:   // slop-ignore: signal-1
 *   JSX:  {/* slop-ignore: signal-1 * /}
 *
 * A suppression applies to the next line after the comment.
 */
import type { SuppressionFact } from "../../ir/types.js";
/**
 * Parse all suppression comments from source text.
 * Returns SuppressionFact[] with the line the suppression applies to
 * (the line after the comment, or the same line if inline).
 */
export declare function parseSuppressions(source: string, file: string): SuppressionFact[];
/**
 * Check whether a given line number in a file is suppressed for a specific signal.
 * A line is suppressed if there's a suppression comment on the same line or the previous line.
 */
export declare function isLineSuppressed(suppressions: SuppressionFact[], file: string, line: number, signalId: string): boolean;
