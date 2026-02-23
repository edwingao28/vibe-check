/**
 * Dead Dependency signal analyzer.
 *
 * Detects heavy/specialty npm packages that are listed in package.json but
 * never actually imported anywhere in the source code. AI-generated projects
 * often install impressive-sounding libraries (framer-motion, three.js,
 * recharts, etc.) that are never used.
 *
 * Detection:
 *   1. Read package.json from ctx.projectRoot.
 *   2. Extract dependencies + devDependencies.
 *   3. Check a curated list of heavy packages against actual imports in
 *      source files from ctx.fileList.
 *
 * Scoring:
 *   clamp(unusedCount * 2 / 6, 0, 1) -- 3 unused heavy deps = score 1.0
 *
 * Category: structure
 * Needs: [] (uses projectRoot + fileList directly)
 * Attenuatable: false
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  SignalDefinition,
  SignalResult,
  SignalContext,
  SignalEvidence,
} from "./types.js";
import { clamp } from "./utils/math.js";

/**
 * Curated list of heavy/specialty packages and the import patterns that
 * indicate actual usage. Each entry maps a package name (as it appears in
 * package.json) to one or more substrings that would appear in an import
 * statement's module specifier.
 */
const HEAVY_PACKAGES: Record<string, string[]> = {
  "framer-motion": ["framer-motion", "motion"],
  three: ["three"],
  "@react-three/fiber": ["@react-three"],
  "@react-three/drei": ["@react-three"],
  recharts: ["recharts"],
  d3: ["d3"],
  gsap: ["gsap"],
  "lottie-web": ["lottie"],
  "chart.js": ["chart.js"],
  "mapbox-gl": ["mapbox"],
  "socket.io-client": ["socket.io"],
};

/** File extensions worth scanning for imports. */
const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx)$/;

/** Maximum number of files to read to avoid performance issues. */
const MAX_FILES_TO_READ = 500;

/**
 * Build a regex that matches ESM imports, re-exports, or CJS require calls
 * for the given module substrings.
 *
 * Matches:
 *   from "framer-motion"
 *   from 'framer-motion'
 *   require("framer-motion")
 *   require('framer-motion')
 */
function buildImportPattern(moduleSubstrings: string[]): RegExp {
  const escaped = moduleSubstrings.map((s) =>
    s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const alternation = escaped.join("|");
  return new RegExp(
    `(?:from\\s+["'](?:[^"']*(?:${alternation})[^"']*)["']|require\\(\\s*["'](?:[^"']*(?:${alternation})[^"']*)["']\\s*\\))`,
  );
}

/**
 * Read package.json from the given project root.
 * Returns parsed dependencies/devDependencies keys, or null if unreadable.
 */
function readPackageDeps(projectRoot: string): { allDeps: Set<string> } | null {
  try {
    const raw = readFileSync(resolve(projectRoot, "package.json"), "utf-8");
    const pkg = JSON.parse(raw);
    const deps = Object.keys(pkg.dependencies ?? {});
    const devDeps = Object.keys(pkg.devDependencies ?? {});
    return { allDeps: new Set([...deps, ...devDeps]) };
  } catch {
    return null;
  }
}

export const deadDependency: SignalDefinition = {
  id: "dead-dependency",
  name: "Dead Dependency",
  category: "structure",
  needs: [],
  attenuatable: false,

  analyze(ctx: SignalContext): SignalResult {
    const insufficientResult: SignalResult = {
      id: "dead-dependency",
      name: "Dead Dependency",
      category: "structure",
      score: 0,
      rawScore: 0,
      attenuatedScore: 0,
      status: "insufficient_data",
      confidence: "low",
      evidence: [],
    };

    // Guard: need projectRoot to locate package.json
    if (!ctx.projectRoot) {
      return insufficientResult;
    }

    // Read package.json
    const pkgInfo = readPackageDeps(ctx.projectRoot);
    if (!pkgInfo) {
      return insufficientResult;
    }

    // Determine which heavy packages are installed
    const installedHeavy = Object.keys(HEAVY_PACKAGES).filter((pkg) =>
      pkgInfo.allDeps.has(pkg),
    );

    // No heavy packages installed — clean project, score 0
    if (installedHeavy.length === 0) {
      return {
        id: "dead-dependency",
        name: "Dead Dependency",
        category: "structure",
        score: 0,
        rawScore: 0,
        attenuatedScore: 0,
        status: "scored",
        confidence: "high",
        evidence: [
          {
            summary: "No heavy/specialty packages found in package.json",
            files: [],
          },
        ],
      };
    }

    // Build a combined source content string from all readable source files
    // to check for imports. We read files from fileList.
    const fileList = ctx.fileList ?? [];
    const sourceFiles = fileList
      .filter((f) => SOURCE_EXTENSIONS.test(f))
      .slice(0, MAX_FILES_TO_READ);

    // Read all source file contents into a single searchable buffer
    const fileContents: string[] = [];
    for (const relativePath of sourceFiles) {
      try {
        const absolutePath = resolve(ctx.projectRoot, relativePath);
        const content = readFileSync(absolutePath, "utf-8");
        fileContents.push(content);
      } catch {
        // File unreadable — skip silently
      }
    }
    const allSource = fileContents.join("\n");

    // Check each installed heavy package for usage
    const unusedDeps: string[] = [];

    for (const pkg of installedHeavy) {
      const moduleSubstrings = HEAVY_PACKAGES[pkg];
      const pattern = buildImportPattern(moduleSubstrings);
      if (!pattern.test(allSource)) {
        unusedDeps.push(pkg);
      }
    }

    const unusedCount = unusedDeps.length;
    const rawScore = clamp((unusedCount * 2) / 6, 0, 1);
    const score = rawScore;

    const evidence: SignalEvidence[] = [];

    if (unusedCount > 0) {
      evidence.push({
        summary: `${unusedCount} heavy package(s) installed but never imported: ${unusedDeps.join(", ")}`,
        files: [],
        detail: `These packages appear in package.json but no import/require was found in ${sourceFiles.length} source file(s): ${unusedDeps.join(", ")}`,
      });
    } else {
      evidence.push({
        summary: `All ${installedHeavy.length} heavy package(s) are imported in source code`,
        files: [],
      });
    }

    return {
      id: "dead-dependency",
      name: "Dead Dependency",
      category: "structure",
      score,
      rawScore,
      attenuatedScore: score,
      status: "scored",
      confidence: sourceFiles.length > 0 ? "high" : "medium",
      evidence,
    };
  },
};

export default deadDependency;
