/**
 * Inline Style Extractor — Uses @babel/parser to parse JSX/TSX
 * and extract style={{...}} expressions as StyleFact[] and ColorFact[].
 *
 * Static key-value pairs are extracted with high confidence.
 * Dynamic/computed values are tagged as low confidence.
 */
import type { StyleFact, ColorFact, TextFact, StructuralFact, SuppressionFact } from "../ir/types.js";
import type { ExtractorResult } from "./types.js";
/**
 * Parse a JSX/TSX file and extract inline style facts.
 */
export declare function parseInlineStyles(content: string, file: string): {
    facts: StyleFact[];
    colors: ColorFact[];
    texts: TextFact[];
    structures: StructuralFact[];
    suppressions: SuppressionFact[];
};
/**
 * Run the inline style extractor over a list of JSX/TSX files.
 */
export declare function extractInlineStyles(files: string[]): ExtractorResult;
