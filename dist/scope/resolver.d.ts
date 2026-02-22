import type { SlopConfig } from "../config/types.js";
import type { ScopeResult } from "./types.js";
/**
 * Resolves the scan scope for the slop detector.
 *
 * Priority order (per SPEC section 7.1):
 * 1. User-specified path -> use it (method: "user-specified")
 * 2. --full flag -> scan project root (method: "full")
 * 3. Smart UI scope: if src/ exists scan src/, else scan root limited to UI_DIRECTORIES
 *
 * @param projectRoot - Absolute path to the project root
 * @param userPath - Optional user-specified path (relative or absolute)
 * @param full - If true, scan the entire project root
 * @param config - Optional SlopConfig for additional exclude patterns
 * @returns ScopeResult with method, resolved path, file list, and applied excludes
 */
export declare function resolveScope(projectRoot: string, userPath?: string, full?: boolean, config?: SlopConfig): ScopeResult;
