import { minimatch } from "minimatch";
/**
 * Checks whether a file path matches any of the provided exclude patterns.
 * Uses minimatch for glob pattern matching.
 *
 * @param filePath - Relative file path to check (relative to project root)
 * @param patterns - Glob patterns to match against (e.g., "node_modules/**", "**\/*.test.*")
 * @returns true if the file should be excluded
 */
export function isExcluded(filePath, patterns) {
    // Normalize path separators to forward slashes for consistent matching
    const normalized = filePath.replace(/\\/g, "/");
    return patterns.some((pattern) => minimatch(normalized, pattern, { dot: true }));
}
//# sourceMappingURL=excludes.js.map