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

import type {
  SignalDefinition,
  SignalResult,
  SignalContext,
  SignalEvidence,
} from "./types.js";
import { clamp } from "./utils/math.js";

/** File extensions that identify component files */
const COMPONENT_EXTENSIONS = /\.(tsx|jsx)$/;

/**
 * Patterns that identify UI library files (paths relative to project root).
 *
 * Matches:
 *   - components/ui/   — shadcn/ui default directory
 *   - src/components/ui/ — common src-prefixed variant
 */
const UI_LIBRARY_PATTERNS: RegExp[] = [/(?:^|\/)components\/ui\//];

/**
 * Patterns that identify custom component files.
 *
 * Matches .tsx/.jsx files in:
 *   - components/ (but NOT components/ui/)
 *   - app/, pages/, views/, features/, modules/
 */
const CUSTOM_COMPONENT_DIR_PATTERNS: RegExp[] = [
  /(?:^|\/)components\/(?!ui\/)/,
  /(?:^|\/)app\//,
  /(?:^|\/)pages\//,
  /(?:^|\/)views\//,
  /(?:^|\/)features\//,
  /(?:^|\/)modules\//,
];

/**
 * Classify a file path as "ui-library", "custom", or "other".
 */
function classifyFile(filePath: string): "ui-library" | "custom" | "other" {
  // Must be a component file extension
  if (!COMPONENT_EXTENSIONS.test(filePath)) return "other";

  // Check UI library patterns first (more specific)
  for (const pattern of UI_LIBRARY_PATTERNS) {
    if (pattern.test(filePath)) return "ui-library";
  }

  // Check custom component patterns
  for (const pattern of CUSTOM_COMPONENT_DIR_PATTERNS) {
    if (pattern.test(filePath)) return "custom";
  }

  return "other";
}

export const scaffoldBloat: SignalDefinition = {
  id: "scaffold-bloat",
  name: "Scaffold Bloat",
  category: "structure",
  needs: [],
  attenuatable: false,

  analyze(ctx: SignalContext): SignalResult {
    const { fileList } = ctx;

    // No fileList available — cannot analyze
    if (!fileList) {
      return {
        id: "scaffold-bloat",
        name: "Scaffold Bloat",
        category: "structure",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "insufficient_data",
        confidence: "low",
        evidence: [],
      };
    }

    // Classify all files
    const uiLibraryFiles: string[] = [];
    const customFiles: string[] = [];

    for (const filePath of fileList) {
      const classification = classifyFile(filePath);
      if (classification === "ui-library") {
        uiLibraryFiles.push(filePath);
      } else if (classification === "custom") {
        customFiles.push(filePath);
      }
    }

    const uiLibraryCount = uiLibraryFiles.length;
    const customCount = customFiles.length;
    const totalComponentFiles = uiLibraryCount + customCount;

    // No component files found — insufficient data
    if (totalComponentFiles === 0) {
      return {
        id: "scaffold-bloat",
        name: "Scaffold Bloat",
        category: "structure",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "insufficient_data",
        confidence: "low",
        evidence: [],
      };
    }

    // Compute ratio and score
    const ratio = uiLibraryCount / totalComponentFiles;
    const rawScore = clamp((ratio - 0.5) / 0.4, 0, 1);
    const score = rawScore;

    const evidence: SignalEvidence[] = [];

    if (score > 0) {
      evidence.push({
        summary: `${uiLibraryCount} UI library file(s) vs ${customCount} custom component file(s) (ratio: ${(ratio * 100).toFixed(0)}%)`,
        files: uiLibraryFiles.slice(0, 10),
        detail: `UI library components dominate the component tree. ${uiLibraryCount} of ${totalComponentFiles} component files are from UI libraries.`,
      });
    } else {
      evidence.push({
        summary: `${uiLibraryCount} UI library file(s) vs ${customCount} custom component file(s) (ratio: ${(ratio * 100).toFixed(0)}%)`,
        files: [],
      });
    }

    return {
      id: "scaffold-bloat",
      name: "Scaffold Bloat",
      category: "structure",
      score,
      rawScore,
      attenuatedScore: score,
      status: "scored",
      confidence: totalComponentFiles >= 5 ? "high" : "medium",
      evidence,
    };
  },
};

export default scaffoldBloat;
