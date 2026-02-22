/**
 * Checks whether a file path matches any of the provided exclude patterns.
 * Uses minimatch for glob pattern matching.
 *
 * @param filePath - Relative file path to check (relative to project root)
 * @param patterns - Glob patterns to match against (e.g., "node_modules/**", "**\/*.test.*")
 * @returns true if the file should be excluded
 */
export declare function isExcluded(filePath: string, patterns: string[]): boolean;
