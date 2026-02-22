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

import type { SignalDefinition, SignalResult, SignalContext } from "./types.js";
import { clamp } from "./utils/math.js";

function analyze(ctx: SignalContext): SignalResult {
  const radiusFacts = ctx.facts.filter((f) => f.property === "border-radius");

  if (radiusFacts.length === 0) {
    return {
      id: "border-radius-maximum",
      name: "Border Radius Maximum",
      category: "spacing-effects",
      score: 0,
      rawScore: 0,
      attenuatedScore: 0,
      status: "scored",
      confidence: "high",
      evidence: [
        {
          summary: "No border-radius declarations found",
          files: [],
        },
      ],
    };
  }

  // Count value frequencies
  const counts = new Map<string, number>();
  for (const fact of radiusFacts) {
    const normalized = fact.value.toLowerCase().trim();
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  // Find most common value
  let mostCommonValue = "";
  let mostCommonCount = 0;
  for (const [value, count] of counts) {
    if (count > mostCommonCount) {
      mostCommonValue = value;
      mostCommonCount = count;
    }
  }

  const mostCommonRatio = mostCommonCount / radiusFacts.length;
  const rawScore = clamp(mostCommonRatio - 0.3, 0, 1);

  const files = radiusFacts
    .filter((f) => f.value.toLowerCase().trim() === mostCommonValue)
    .slice(0, 10)
    .map((f) => `${f.file}:${f.line}`);

  return {
    id: "border-radius-maximum",
    name: "Border Radius Maximum",
    category: "spacing-effects",
    score: rawScore,
    rawScore,
    attenuatedScore: rawScore,
    status: "scored",
    confidence: "high",
    evidence: [
      {
        summary: `${(mostCommonRatio * 100).toFixed(0)}% of border-radius declarations use '${mostCommonValue}'`,
        files,
        detail: `${counts.size} distinct radius values across ${radiusFacts.length} declarations`,
      },
    ],
  };
}

export const borderRadiusMaximum: SignalDefinition = {
  id: "border-radius-maximum",
  name: "Border Radius Maximum",
  category: "spacing-effects",
  needs: ["css", "tailwind"],
  attenuatable: true,
  analyze,
};
