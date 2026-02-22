/**
 * CSS Extractor — PostCSS-based CSS/SCSS parser.
 *
 * Parses .css, .scss, .sass files and extracts StyleFact[], ColorFact[],
 * and SuppressionFact[] for the IR store.
 */
import type { StyleFact, ColorFact, SuppressionFact, SourceType } from "../ir/types.js";
import type { ExtractorResult } from "./types.js";
/**
 * Parse a single CSS file and return facts.
 */
export declare function parseCssFile(content: string, file: string, sourceType?: SourceType): {
    facts: StyleFact[];
    colors: ColorFact[];
    suppressions: SuppressionFact[];
};
/**
 * Run the CSS extractor over a list of CSS/SCSS/SASS files.
 */
export declare function extractCss(files: string[], sourceType?: SourceType): ExtractorResult;
