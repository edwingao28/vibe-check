/**
 * Markdown Report Generator — Transforms a ScanReport into an actionable
 * markdown document that users can read or feed to Claude Code for fixes.
 */
import type { ScanReport } from "./types.js";
/**
 * Generate a markdown report string from a ScanReport.
 */
export declare function generateMarkdownReport(report: ScanReport): string;
