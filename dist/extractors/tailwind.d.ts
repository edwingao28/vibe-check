/**
 * Tailwind Extractor — Scans JSX/TSX/JS/TS files for Tailwind class names
 * and resolves them to StyleFact[] and ColorFact[].
 *
 * Also reads tailwind.config.js/ts for custom theme entries.
 * Tracks @apply directives in CSS files.
 */
import type { StyleFact, ColorFact, SuppressionFact } from "../ir/types.js";
import type { ExtractorResult } from "./types.js";
/**
 * Read tailwind.config.js/ts and count custom theme entries.
 */
export declare function readTailwindConfig(projectRoot: string): {
    customEntryCount: number;
    customColors: Record<string, string>;
};
/**
 * Parse a file's content and extract Tailwind-related facts.
 */
export declare function parseTailwindFile(content: string, file: string): {
    facts: StyleFact[];
    colors: ColorFact[];
    suppressions: SuppressionFact[];
};
/**
 * Run the Tailwind extractor over a list of files.
 */
export declare function extractTailwind(files: string[], _projectRoot?: string): ExtractorResult;
