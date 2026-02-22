/**
 * Shadow Realm signal analyzer.
 *
 * Detects excessive shadow usage. AI-generated sites often apply box-shadow
 * to a large fraction of components, creating a "floating card" look.
 *
 * Score: shadowComponentRatio clamped to [0, 1]
 *   - Components with shadows / total components
 *
 * Components are approximated by unique (file, component) pairs in the IR.
 * If component names are unavailable, unique files serve as proxy.
 *
 * Category: spacing-effects
 * Needs: ["css", "tailwind"]
 * Attenuatable: yes
 */

import type { SignalDefinition, SignalResult, SignalContext } from "./types.js";
import { clamp } from "./utils/math.js";

function analyze(ctx: SignalContext): SignalResult {
  const shadowFacts = ctx.facts.filter((f) => f.property === "box-shadow");

  if (shadowFacts.length === 0) {
    return {
      id: "shadow-realm",
      name: "Shadow Realm",
      category: "spacing-effects",
      score: 0,
      rawScore: 0,
      attenuatedScore: 0,
      status: "scored",
      confidence: "high",
      evidence: [
        {
          summary: "No box-shadow declarations found",
          files: [],
        },
      ],
    };
  }

  // Derive component count from all facts (not just shadow facts)
  // A "component" is a unique (file, component?) pair
  const allComponents = new Set<string>();
  const shadowComponents = new Set<string>();

  for (const fact of ctx.facts) {
    const key = fact.component ? `${fact.file}::${fact.component}` : fact.file;
    allComponents.add(key);
  }

  for (const fact of shadowFacts) {
    const key = fact.component ? `${fact.file}::${fact.component}` : fact.file;
    shadowComponents.add(key);
  }

  // Avoid division by zero
  const totalComponents = allComponents.size;
  if (totalComponents === 0) {
    return {
      id: "shadow-realm",
      name: "Shadow Realm",
      category: "spacing-effects",
      score: 0,
      rawScore: 0,
      attenuatedScore: 0,
      status: "scored",
      confidence: "high",
      evidence: [{ summary: "No components detected", files: [] }],
    };
  }

  const ratio = shadowComponents.size / totalComponents;
  const rawScore = clamp(ratio, 0, 1);

  const files = shadowFacts.slice(0, 10).map((f) => `${f.file}:${f.line}`);

  return {
    id: "shadow-realm",
    name: "Shadow Realm",
    category: "spacing-effects",
    score: rawScore,
    rawScore,
    attenuatedScore: rawScore,
    status: "scored",
    confidence: "high",
    evidence: [
      {
        summary: `Shadows on ${(ratio * 100).toFixed(0)}% of components (${shadowComponents.size}/${totalComponents})`,
        files,
      },
    ],
  };
}

export const shadowRealm: SignalDefinition = {
  id: "shadow-realm",
  name: "Shadow Realm",
  category: "spacing-effects",
  needs: ["css", "tailwind"],
  attenuatable: true,
  analyze,
};
