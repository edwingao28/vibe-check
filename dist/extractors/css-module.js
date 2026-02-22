/**
 * CSS Module Extractor — Delegates to the CSS extractor but tags all facts
 * with source:"css-module" and attempts to detect the component from the
 * .module.css filename convention.
 */
import { readFileSync } from "node:fs";
import { parseCssFile } from "./css.js";
/**
 * Detect the component name from a .module.css filename.
 * e.g., "Card.module.css" → "Card", "header.module.scss" → "header"
 */
function detectComponentFromModuleFile(filePath) {
    const match = filePath.match(/([^/\\]+)\.module\.\w+$/);
    if (!match)
        return undefined;
    return match[1];
}
/**
 * Run the CSS Module extractor over a list of .module.css/.module.scss files.
 * Delegates to the CSS extractor but overrides source type and adds component metadata.
 */
export function extractCssModules(files) {
    const allFacts = [];
    const allColors = [];
    const allSuppressions = [];
    const errors = [];
    let filesParsed = 0;
    for (const file of files) {
        try {
            const content = readFileSync(file, "utf-8");
            const component = detectComponentFromModuleFile(file);
            // Delegate to the CSS parser with css-module source type
            const result = parseCssFile(content, file, "css-module");
            // Tag facts with the component name if detected
            for (const fact of result.facts) {
                if (component && !fact.component) {
                    fact.component = component;
                }
                allFacts.push(fact);
            }
            allColors.push(...result.colors);
            allSuppressions.push(...result.suppressions);
            filesParsed++;
        }
        catch (err) {
            errors.push({
                file,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }
    const coverage = files.length > 0 ? filesParsed / files.length : 1;
    return {
        name: "css-module",
        status: files.length === 0
            ? "healthy"
            : filesParsed / files.length > 0.95
                ? "healthy"
                : filesParsed / files.length >= 0.5
                    ? "degraded"
                    : "failed",
        filesAttempted: files.length,
        filesParsed,
        coverage,
        facts: allFacts,
        colors: allColors,
        texts: [],
        structures: [],
        suppressions: allSuppressions,
        errors,
    };
}
//# sourceMappingURL=css-module.js.map