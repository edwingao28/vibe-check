/**
 * Gradient Overload signal analyzer.
 *
 * Detects excessive gradient usage. AI-generated sites often apply gradients
 * liberally across many components.
 *
 * Score: `min(1, avgGradientsPerFile / 3)`
 *   - Average of 3+ gradients per file = score 1.0
 *   - Average of 1.5 gradients per file = score 0.5
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

  // Count gradients per unique file
  const gradientsPerFile = new Map<string, number>();
  for (const fact of gradientFacts) {
    gradientsPerFile.set(fact.file, (gradientsPerFile.get(fact.file) ?? 0) + 1);
  }

  const fileCount = gradientsPerFile.size;
  const avgPerFile = gradientFacts.length / fileCount;
  const rawScore = clamp(avgPerFile / 3, 0, 1);

  const files = gradientFacts.slice(0, 10).map((f) => `${f.file}:${f.line}`);

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
        summary: `${gradientFacts.length} gradient declarations across ${fileCount} files (avg ${avgPerFile.toFixed(1)}/file)`,
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
