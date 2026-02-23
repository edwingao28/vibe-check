/**
 * Scaffold Bloat signal analyzer.
 *
 * Detects when a project has an excessive ratio of UI library components
 * (shadcn/ui, Radix, etc.) vs custom components — a hallmark of AI-scaffolded
 * projects that install dozens of library components but barely customize anything.
 *
 * Detection:
 *   1. From ctx.fileList, categorize files into UI library files and custom
 *      component files based on path patterns.
 *   2. Compute ratio: uiLibraryCount / (uiLibraryCount + customCount)
 *
 * Scoring:
 *   clamp((ratio - 0.5) / 0.4, 0, 1)
 *   Kicks in when >50% of components are library files, saturates at 90%.
 */
import type { SignalDefinition } from "./types.js";
export declare const scaffoldBloat: SignalDefinition;
export default scaffoldBloat;
