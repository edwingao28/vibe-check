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

/** Pattern that matches slop-ignore in any comment style */
const SUPPRESSION_PATTERN = /slop-ignore\s*:\s*([^*}\n]+)/;

/**
 * Parse all suppression comments from source text.
 * Returns SuppressionFact[] with the line the suppression applies to
 * (the line after the comment, or the same line if inline).
 */
export function parseSuppressions(source: string, file: string): SuppressionFact[] {
  const facts: SuppressionFact[] = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(SUPPRESSION_PATTERN);
    if (!match) continue;

    const signalsPart = match[1].trim();
    // Remove trailing comment closers: */, }, */}
    const cleaned = signalsPart
      .replace(/\s*\*\/\s*\}?\s*$/, "")
      .replace(/\s*\}?\s*$/, "")
      .trim();

    const signals = cleaned
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (signals.length > 0) {
      // The suppression targets the next line (1-indexed)
      // If the comment is on a line by itself, it applies to the next line.
      // We report the line number of the comment itself (1-indexed).
      facts.push({
        signals,
        file,
        line: i + 1,
      });
    }
  }

  return facts;
}

/**
 * Check whether a given line number in a file is suppressed for a specific signal.
 * A line is suppressed if there's a suppression comment on the same line or the previous line.
 */
export function isLineSuppressed(
  suppressions: SuppressionFact[],
  file: string,
  line: number,
  signalId: string
): boolean {
  return suppressions.some(
    (s) =>
      s.file === file &&
      (s.line === line || s.line === line - 1) &&
      (s.signals.includes(signalId) || s.signals.includes("*"))
  );
}
