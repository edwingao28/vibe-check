/**
 * Placeholder Content signal analyzer.
 *
 * Detects fake/placeholder data in text content — AI-generated projects
 * often have placeholder metrics ("10,000+", "$99.99/mo"), dummy names
 * ("John Doe", "Jane Smith"), and lorem ipsum text in dashboards and
 * landing pages.
 *
 * Scoring:
 *   Scans all TextFact[] for placeholder patterns across four categories:
 *   - Lorem ipsum (weight 5)
 *   - Fake names (weight 2)
 *   - Placeholder metrics (weight 1)
 *   - Generic placeholder text (weight 2)
 *
 *   score = clamp(totalWeightedHits / 15, 0, 1) — saturates at 15 weighted points.
 */
import type { SignalDefinition } from "./types.js";
export declare const placeholderContent: SignalDefinition;
export default placeholderContent;
