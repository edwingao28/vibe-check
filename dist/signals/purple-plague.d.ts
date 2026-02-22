/**
 * Purple Plague signal analyzer.
 *
 * Detects over-reliance on purple hues, a hallmark of AI-generated designs.
 * Uses a hybrid approach: resolved colors are analyzed by hue distribution,
 * unresolved tokens contribute to tokenization ratio.
 *
 * Score factors:
 *   - purpleRatio * 0.6: fraction of chromatic colors in purple range (260-310 deg)
 *   - (1 - tokenRatio) * 0.2: low tokenization = less intentional design
 *   - lowVariance * 0.2: purple hues clustering = less variety
 *
 * Only triggers when purpleRatio > 0.3 AND >= 5 chromatic colors.
 *
 * Category: typography-color
 * Needs: ["css", "tailwind", "inline"]
 * Attenuatable: yes
 */
import type { SignalDefinition } from "./types.js";
export declare const purplePlague: SignalDefinition;
