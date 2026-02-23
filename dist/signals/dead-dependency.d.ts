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
import type { SignalDefinition } from "./types.js";
export declare const deadDependency: SignalDefinition;
export default deadDependency;
