/**
 * Gradient Overload signal analyzer.
 *
 * Detects excessive gradient usage. AI-generated sites often apply gradients
 * liberally across many components.
 *
 * Tailwind extractors emit separate StyleFact entries for each part of a
 * single gradient (e.g. `bg-gradient-to-br`, `from-primary/5`, `via-transparent`,
 * `to-accent/10`). To avoid over-counting, facts are grouped into **gradient
 * instances** by proximity: facts in the same file within 3 lines of each
 * other are considered part of the same gradient instance.
 *
 * Score: `min(1, avgInstancesPerFile / 3)`
 *   - Average of 3+ gradient instances per file = score 1.0
 *   - Average of 1.5 gradient instances per file = score 0.5
 *   - No gradients = score 0
 *
 * Gradient facts are identified by value containing "gradient" or by
 * property indicating a gradient (e.g., background-image with gradient value).
 *
 * Category: spacing-effects
 * Needs: ["css", "tailwind"]
 * Attenuatable: no (entropy/drift signal)
 */

import type { SignalDefinition, SignalResult, SignalContext } from "./types.js";
import { clamp } from "./utils/math.js";

function isGradientFact(fact: { property: string; value: string }): boolean {
  const v = fact.value.toLowerCase();
  return (
    v.includes("gradient") ||
    v.includes("linear-gradient") ||
    v.includes("radial-gradient") ||
    v.includes("conic-gradient")
  );
}

function analyze(ctx: SignalContext): SignalResult {
  const gradientFacts = ctx.facts.filter((f) => isGradientFact(f));

  if (gradientFacts.length === 0) {
    return {
      id: "gradient-overload",
      name: "Gradient Overload",
      category: "spacing-effects",
      score: 0,
      rawScore: 0,
      attenuatedScore: 0,
      status: "scored",
      confidence: "high",
      evidence: [
        {
          summary: "No gradient declarations found",
          files: [],
        },
      ],
    };
  }

  // Group gradient facts into instances by proximity.
  // Facts in the same file within 3 lines of each other belong to the same
  // gradient instance (e.g. bg-gradient-to-br + from-* + via-* + to-*).
  const sorted = [...gradientFacts].sort((a, b) =>
    a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line,
  );

  const LINE_PROXIMITY = 3;
  const instancesPerFile = new Map<string, number>();
  let currentFile = sorted[0].file;
  let currentLine = sorted[0].line;
  let instanceCount = 1;
  instancesPerFile.set(currentFile, 1);

  for (let i = 1; i < sorted.length; i++) {
    const fact = sorted[i];
    if (fact.file !== currentFile || fact.line - currentLine > LINE_PROXIMITY) {
      // New gradient instance
      instanceCount++;
      if (fact.file !== currentFile) {
        currentFile = fact.file;
      }
      instancesPerFile.set(
        fact.file,
        (instancesPerFile.get(fact.file) ?? 0) + 1,
      );
    }
    currentLine = fact.line;
  }

  const fileCount = instancesPerFile.size;
  const avgInstancesPerFile = instanceCount / fileCount;
  const rawScore = clamp(avgInstancesPerFile / 3, 0, 1);

  const files = sorted.slice(0, 10).map((f) => `${f.file}:${f.line}`);

  return {
    id: "gradient-overload",
    name: "Gradient Overload",
    category: "spacing-effects",
    score: rawScore,
    rawScore,
    attenuatedScore: rawScore,
    status: "scored",
    confidence: "high",
    evidence: [
      {
        summary: `${instanceCount} gradient instances across ${fileCount} files (avg ${avgInstancesPerFile.toFixed(1)}/file)`,
        files,
      },
    ],
  };
}

export const gradientOverload: SignalDefinition = {
  id: "gradient-overload",
  name: "Gradient Overload",
  category: "spacing-effects",
  needs: ["css", "tailwind"],
  attenuatable: false,
  analyze,
};
