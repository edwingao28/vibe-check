import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { DEFAULT_EXCLUDES, SCANNABLE_EXTENSIONS, UI_DIRECTORIES } from "../config/defaults.js";
import { isExcluded } from "./excludes.js";
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
export function resolveScope(projectRoot, userPath, full, config) {
    const excludePatterns = [
        ...DEFAULT_EXCLUDES,
        ...(config?.scope.exclude ?? []),
    ];
    // 1. User-specified path
    if (userPath) {
        const resolvedPath = isAbsolute(userPath)
            ? userPath
            : join(projectRoot, userPath);
        const files = collectFiles(resolvedPath, projectRoot, excludePatterns);
        return {
            method: "user-specified",
            resolvedPath: relative(projectRoot, resolvedPath) || userPath,
            files,
            excludesApplied: excludePatterns,
        };
    }
    // 2. Full scan
    if (full) {
        const files = collectFiles(projectRoot, projectRoot, excludePatterns);
        return {
            method: "full",
            resolvedPath: ".",
            files,
            excludesApplied: excludePatterns,
        };
    }
    // 3. Smart UI scope
    return resolveSmartScope(projectRoot, excludePatterns);
}
/**
 * Common frontend source container directories, checked in priority order.
 *
 * These are directories that wrap the ENTIRE frontend source tree.
 * Individual UI directories (app/, components/, pages/) are NOT listed here —
 * they're handled by the UI_DIRECTORIES fallback.
 */
const FRONTEND_ROOTS = [
    // Standard single-app layouts
    "src",
    // Full-stack apps (Express/Hono/Fastify + React/Vue)
    "client/src",
    "client",
    "frontend/src",
    "frontend",
    "web/src",
    "web",
    // Monorepo patterns (Turborepo, Nx, etc.)
    "apps/web/src",
    "apps/web",
    "apps/frontend/src",
    "apps/frontend",
    "apps/client/src",
    "apps/client",
    "packages/ui/src",
    "packages/ui",
];
/**
 * Check if a directory contains at least one scannable UI file.
 */
function hasScannableFiles(dirPath) {
    if (!existsSync(dirPath) || !isDirectory(dirPath))
        return false;
    let entries;
    try {
        entries = readdirSync(dirPath, { withFileTypes: true });
    }
    catch {
        return false;
    }
    for (const entry of entries) {
        if (entry.isFile()) {
            const ext = extname(entry.name);
            if (SCANNABLE_EXTENSIONS.includes(ext))
                return true;
        }
        if (entry.isDirectory()) {
            // Check one level of subdirectories for UI files
            const subPath = join(dirPath, entry.name);
            let subEntries;
            try {
                subEntries = readdirSync(subPath, { withFileTypes: true });
            }
            catch {
                continue;
            }
            for (const sub of subEntries) {
                if (sub.isFile()) {
                    const ext = extname(sub.name);
                    if (SCANNABLE_EXTENSIONS.includes(ext))
                        return true;
                }
            }
        }
    }
    return false;
}
/**
 * Smart UI scope detection.
 *
 * Checks common frontend directory patterns in priority order:
 * 1. FRONTEND_ROOTS — common source locations (src/, client/src/, apps/web/, etc.)
 * 2. UI_DIRECTORIES — fallback for non-standard layouts
 * 3. Root-level files — catch-all for flat projects
 */
function resolveSmartScope(projectRoot, excludePatterns) {
    // 1. Check FRONTEND_ROOTS in priority order
    for (const frontendRoot of FRONTEND_ROOTS) {
        const candidatePath = join(projectRoot, frontendRoot);
        if (existsSync(candidatePath) && isDirectory(candidatePath) && hasScannableFiles(candidatePath)) {
            const files = collectFiles(candidatePath, projectRoot, excludePatterns);
            if (files.length > 0) {
                return {
                    method: "smart-ui",
                    resolvedPath: frontendRoot,
                    files,
                    excludesApplied: excludePatterns,
                };
            }
        }
    }
    // 2. Fallback: scan project root limited to UI_DIRECTORIES
    const files = [];
    for (const dir of UI_DIRECTORIES) {
        const dirPath = join(projectRoot, dir);
        if (existsSync(dirPath) && isDirectory(dirPath)) {
            files.push(...collectFiles(dirPath, projectRoot, excludePatterns));
        }
    }
    // Also collect files directly at project root (not in subdirs)
    // that match scannable extensions (e.g., root-level page files)
    const rootFiles = collectRootFiles(projectRoot, excludePatterns);
    files.push(...rootFiles);
    // Deduplicate (UI_DIRECTORIES may overlap)
    const uniqueFiles = [...new Set(files)];
    return {
        method: "smart-ui",
        resolvedPath: ".",
        files: uniqueFiles,
        excludesApplied: excludePatterns,
    };
}
/**
 * Recursively collects all files matching SCANNABLE_EXTENSIONS
 * that are not excluded by the patterns.
 */
function collectFiles(dirPath, projectRoot, excludePatterns) {
    const files = [];
    if (!existsSync(dirPath) || !isDirectory(dirPath)) {
        return files;
    }
    walkDirectory(dirPath, projectRoot, excludePatterns, files);
    return files;
}
/**
 * Recursive directory walker.
 */
function walkDirectory(currentPath, projectRoot, excludePatterns, result) {
    let entries;
    try {
        entries = readdirSync(currentPath, { withFileTypes: true });
    }
    catch {
        // Permission denied or other read error — skip silently
        return;
    }
    for (const entry of entries) {
        const name = entry.name;
        const fullPath = join(currentPath, name);
        const relativePath = relative(projectRoot, fullPath);
        if (isExcluded(relativePath, excludePatterns)) {
            continue;
        }
        if (entry.isDirectory()) {
            walkDirectory(fullPath, projectRoot, excludePatterns, result);
        }
        else if (entry.isFile()) {
            const ext = extname(name);
            if (SCANNABLE_EXTENSIONS.includes(ext)) {
                result.push(relativePath);
            }
            // Also include tailwind config files
            if (name.startsWith("tailwind.config")) {
                // Only add if not already included by extension check
                if (!SCANNABLE_EXTENSIONS.includes(ext)) {
                    result.push(relativePath);
                }
            }
        }
    }
}
/**
 * Collects only files at the root level (non-recursive) matching SCANNABLE_EXTENSIONS.
 */
function collectRootFiles(projectRoot, excludePatterns) {
    const files = [];
    let entries;
    try {
        entries = readdirSync(projectRoot, { withFileTypes: true });
    }
    catch {
        return files;
    }
    for (const entry of entries) {
        if (!entry.isFile())
            continue;
        const name = entry.name;
        const relativePath = name;
        if (isExcluded(relativePath, excludePatterns)) {
            continue;
        }
        const ext = extname(name);
        if (SCANNABLE_EXTENSIONS.includes(ext)) {
            files.push(relativePath);
        }
    }
    return files;
}
function isAbsolute(p) {
    return p.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(p);
}
function isDirectory(p) {
    try {
        return statSync(p).isDirectory();
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=resolver.js.map