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
import type { SignalDefinition } from "./types.js";
export declare const gradientOverload: SignalDefinition;
