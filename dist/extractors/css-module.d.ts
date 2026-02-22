/**
 * CSS Module Extractor — Delegates to the CSS extractor but tags all facts
 * with source:"css-module" and attempts to detect the component from the
 * .module.css filename convention.
 */
import type { ExtractorResult } from "./types.js";
/**
 * Run the CSS Module extractor over a list of .module.css/.module.scss files.
 * Delegates to the CSS extractor but overrides source type and adds component metadata.
 */
export declare function extractCssModules(files: string[]): ExtractorResult;
