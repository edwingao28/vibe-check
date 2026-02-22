/**
 * Font Crime signal analyzer.
 *
 * Detects lack of font variety. AI-generated sites often use a single font
 * (e.g., Inter) for everything. A well-designed site typically uses 2-4
 * distinct font families (body, headings, accent, mono).
 *
 * Score: `1 - (min(distinctFonts, 4) / 4)`
 *   - 0 fonts detected = 1.0 (only defaults / no declarations)
 *   - 1 font = 0.75
 *   - 2 fonts = 0.5
 *   - 3 fonts = 0.25
 *   - 4+ fonts = 0.0
 *
 * Category: typography-color
 * Needs: ["css", "tailwind"]
 * Attenuatable: yes (design tokens may justify single font)
 */
import type { SignalDefinition } from "./types.js";
export declare const fontCrime: SignalDefinition;
