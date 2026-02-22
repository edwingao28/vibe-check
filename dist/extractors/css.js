/**
 * CSS Extractor — PostCSS-based CSS/SCSS parser.
 *
 * Parses .css, .scss, .sass files and extracts StyleFact[], ColorFact[],
 * and SuppressionFact[] for the IR store.
 */
import postcss from "postcss";
import postcssScss from "postcss-scss";
import { readFileSync } from "node:fs";
import { resolveColor, isColorValue } from "./utils/color-resolver.js";
import { parseSuppressions } from "./utils/suppression-parser.js";
/** CSS properties that represent colors */
const COLOR_PROPERTIES = new Set([
    "color",
    "background-color",
    "border-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "text-decoration-color",
    "fill",
    "stroke",
    "caret-color",
    "column-rule-color",
    "accent-color",
]);
/** CSS properties we extract as style facts */
const STYLE_PROPERTIES = new Set([
    "font-family",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "gap",
    "row-gap",
    "column-gap",
    "box-shadow",
    "border-radius",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-left-radius",
    "border-bottom-right-radius",
    "background",
    "background-image",
]);
/**
 * Check if a property is a CSS custom property declaration.
 */
function isCustomProperty(prop) {
    return prop.startsWith("--");
}
/**
 * Check if a value contains a gradient.
 */
function containsGradient(value) {
    return /(?:linear|radial|conic)-gradient/i.test(value);
}
/**
 * Extract color values from a CSS value string that might contain
 * multiple colors (e.g., in gradients or shorthand properties).
 */
function extractColorValues(value) {
    const colors = [];
    // Extract hex colors
    const hexPattern = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
    let match;
    while ((match = hexPattern.exec(value)) !== null) {
        colors.push(match[0]);
    }
    // Extract rgb/rgba
    const rgbPattern = /rgba?\([^)]+\)/gi;
    while ((match = rgbPattern.exec(value)) !== null) {
        colors.push(match[0]);
    }
    // Extract hsl/hsla
    const hslPattern = /hsla?\([^)]+\)/gi;
    while ((match = hslPattern.exec(value)) !== null) {
        colors.push(match[0]);
    }
    return colors;
}
/**
 * Parse a single CSS file and return facts.
 */
export function parseCssFile(content, file, sourceType = "css") {
    const facts = [];
    const colors = [];
    // Parse suppressions from raw source
    const suppressions = parseSuppressions(content, file);
    // Parse with PostCSS
    let root;
    try {
        root = postcss().process(content, {
            syntax: postcssScss,
            from: file,
        }).root;
    }
    catch {
        // If SCSS parsing fails, try plain CSS
        root = postcss().process(content, { from: file }).root;
    }
    // Walk all declarations
    root.walkDecls((decl) => {
        const prop = decl.prop;
        const value = decl.value;
        const line = decl.source?.start?.line ?? 0;
        // Extract CSS custom property declarations
        if (isCustomProperty(prop)) {
            facts.push({
                property: prop,
                value,
                rawValue: value,
                source: sourceType,
                file,
                line,
                confidence: "high",
            });
            // Also check if the custom property value is a color
            if (isColorValue(value)) {
                const resolved = resolveColor(value);
                if (resolved) {
                    colors.push({
                        hex: resolved.hex,
                        hsl: resolved.hsl,
                        token: prop,
                        source: sourceType,
                        file,
                        line,
                        confidence: "high",
                    });
                }
            }
            return;
        }
        // Extract color properties
        if (COLOR_PROPERTIES.has(prop)) {
            facts.push({
                property: prop,
                value,
                rawValue: value,
                source: sourceType,
                file,
                line,
                confidence: "high",
            });
            // Try to resolve the color
            const resolved = resolveColor(value);
            if (resolved) {
                colors.push({
                    hex: resolved.hex,
                    hsl: resolved.hsl,
                    source: sourceType,
                    file,
                    line,
                    confidence: "high",
                });
            }
            else if (value.startsWith("var(")) {
                // CSS variable reference — low confidence
                const varName = value.match(/var\(\s*(--[^,)]+)/)?.[1];
                colors.push({
                    token: varName ?? value,
                    source: sourceType,
                    file,
                    line,
                    confidence: "low",
                });
            }
            return;
        }
        // Extract style properties
        if (STYLE_PROPERTIES.has(prop)) {
            facts.push({
                property: prop,
                value,
                rawValue: value,
                source: sourceType,
                file,
                line,
                confidence: "high",
            });
            // Check for gradients in background/background-image
            if ((prop === "background" || prop === "background-image") &&
                containsGradient(value)) {
                // Already captured as a fact; the gradient detection signal will pick it up
                // Also extract any colors from the gradient
                const gradientColors = extractColorValues(value);
                for (const colorStr of gradientColors) {
                    const resolved = resolveColor(colorStr);
                    if (resolved) {
                        colors.push({
                            hex: resolved.hex,
                            hsl: resolved.hsl,
                            source: sourceType,
                            file,
                            line,
                            confidence: "high",
                        });
                    }
                }
            }
            // Extract colors from box-shadow
            if (prop === "box-shadow") {
                const shadowColors = extractColorValues(value);
                for (const colorStr of shadowColors) {
                    const resolved = resolveColor(colorStr);
                    if (resolved) {
                        colors.push({
                            hex: resolved.hex,
                            hsl: resolved.hsl,
                            source: sourceType,
                            file,
                            line,
                            confidence: "medium",
                        });
                    }
                }
            }
            return;
        }
    });
    return { facts, colors, suppressions };
}
/**
 * Determine extractor health status based on coverage.
 */
function getStatus(filesAttempted, filesParsed) {
    if (filesAttempted === 0)
        return "healthy";
    const coverage = filesParsed / filesAttempted;
    if (coverage > 0.95)
        return "healthy";
    if (coverage >= 0.5)
        return "degraded";
    return "failed";
}
/**
 * Run the CSS extractor over a list of CSS/SCSS/SASS files.
 */
export function extractCss(files, sourceType = "css") {
    const allFacts = [];
    const allColors = [];
    const allSuppressions = [];
    const errors = [];
    let filesParsed = 0;
    for (const file of files) {
        try {
            const content = readFileSync(file, "utf-8");
            const result = parseCssFile(content, file, sourceType);
            allFacts.push(...result.facts);
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
        name: sourceType === "css-module" ? "css-module" : "css",
        status: getStatus(files.length, filesParsed),
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
//# sourceMappingURL=css.js.map