/**
 * Cookie Cutter Layout signal analyzer.
 *
 * Detects when multiple pages share the same structural layout pattern,
 * suggesting template-driven design. Uses Jaccard similarity on page
 * fingerprints (ordered lists of section types).
 *
 * Scoring:
 *   fingerprint = ordered list of sectionType per page
 *   similarity = Jaccard similarity between fingerprint pairs
 *   score = avg pairwise similarity - 0.3 baseline, clamped [0,1]
 *   <2 pages => score 0
 */
import type { SignalDefinition } from "./types.js";
export declare const cookieCutterLayout: SignalDefinition;
export default cookieCutterLayout;
