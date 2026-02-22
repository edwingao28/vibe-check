/**
 * Hero Syndrome signal analyzer.
 *
 * Detects the classic AI-generated hero section pattern:
 * one heading + one paragraph + one CTA button — the universal
 * template for slop landing pages.
 *
 * Primary path: examine StructuralFact[] for hero sections and correlate
 * with TextFact[] to check the 1h+1p+1btn template pattern.
 *
 * Fallback: if no StructuralFacts are available, scan TextFact[] directly
 * for h1+p+button patterns in the first 50 lines of each page file.
 */
import type { SignalDefinition } from "./types.js";
export declare const heroSyndrome: SignalDefinition;
export default heroSyndrome;
