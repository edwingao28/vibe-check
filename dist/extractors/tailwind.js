/**
 * Tailwind Extractor — Scans JSX/TSX/JS/TS files for Tailwind class names
 * and resolves them to StyleFact[] and ColorFact[].
 *
 * Also reads tailwind.config.js/ts for custom theme entries.
 * Tracks @apply directives in CSS files.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolveTailwindColor } from "./utils/color-resolver.js";
import { TAILWIND_COLORS } from "./utils/tailwind-palette.js";
import { parseSuppressions } from "./utils/suppression-parser.js";
// ---- Tailwind class → fact mapping ----
/** Tailwind spacing scale (default 4px base) */
const SPACING_SCALE = {
    "0": "0px",
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "2.5": "10px",
    "3": "12px",
    "3.5": "14px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "7": "28px",
    "8": "32px",
    "9": "36px",
    "10": "40px",
    "11": "44px",
    "12": "48px",
    "14": "56px",
    "16": "64px",
    "20": "80px",
    "24": "96px",
    "28": "112px",
    "32": "128px",
    "36": "144px",
    "40": "160px",
    "44": "176px",
    "48": "192px",
    "52": "208px",
    "56": "224px",
    "60": "240px",
    "64": "256px",
    "72": "288px",
    "80": "320px",
    "96": "384px",
    "px": "1px",
    "auto": "auto",
};
/** Tailwind shadow values */
const SHADOW_VALUES = {
    "shadow-sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "shadow": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    "shadow-md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    "shadow-lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    "shadow-xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "shadow-2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    "shadow-inner": "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
    "shadow-none": "none",
};
/** Tailwind border-radius values */
const RADIUS_VALUES = {
    "rounded-none": "0px",
    "rounded-sm": "0.125rem",
    "rounded": "0.25rem",
    "rounded-md": "0.375rem",
    "rounded-lg": "0.5rem",
    "rounded-xl": "0.75rem",
    "rounded-2xl": "1rem",
    "rounded-3xl": "1.5rem",
    "rounded-full": "9999px",
};
/** Tailwind font family classes */
const FONT_FAMILY_VALUES = {
    "font-sans": "ui-sans-serif, system-ui, sans-serif",
    "font-serif": "ui-serif, Georgia, serif",
    "font-mono": "ui-monospace, monospace",
};
/**
 * Parse a single Tailwind class into a property/value pair.
 * Returns null if the class is not recognized.
 */
function parseTailwindClass(cls) {
    // Remove responsive/state prefixes (e.g., md:, hover:, dark:)
    const unprefixed = cls.replace(/^(?:\w+:)*/, "");
    // Spacing: p-, px-, py-, pt-, pr-, pb-, pl-, m-, mx-, my-, mt-, mr-, mb-, ml-, gap-
    const spacingMatch = unprefixed.match(/^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y)-(.+)$/);
    if (spacingMatch) {
        const [, prefix, size] = spacingMatch;
        const resolved = SPACING_SCALE[size];
        if (resolved) {
            const propertyMap = {
                p: "padding",
                px: "padding-left",
                py: "padding-top",
                pt: "padding-top",
                pr: "padding-right",
                pb: "padding-bottom",
                pl: "padding-left",
                m: "margin",
                mx: "margin-left",
                my: "margin-top",
                mt: "margin-top",
                mr: "margin-right",
                mb: "margin-bottom",
                ml: "margin-left",
                gap: "gap",
                "gap-x": "column-gap",
                "gap-y": "row-gap",
            };
            return {
                property: propertyMap[prefix] ?? "padding",
                value: resolved,
                rawClass: cls,
            };
        }
        // Arbitrary value: p-[20px]
        const arbitraryMatch = size.match(/^\[(.+)\]$/);
        if (arbitraryMatch) {
            const propertyMap = {
                p: "padding",
                px: "padding-left",
                py: "padding-top",
                pt: "padding-top",
                pr: "padding-right",
                pb: "padding-bottom",
                pl: "padding-left",
                m: "margin",
                mx: "margin-left",
                my: "margin-top",
                mt: "margin-top",
                mr: "margin-right",
                mb: "margin-bottom",
                ml: "margin-left",
                gap: "gap",
                "gap-x": "column-gap",
                "gap-y": "row-gap",
            };
            return {
                property: propertyMap[prefix] ?? "padding",
                value: arbitraryMatch[1],
                rawClass: cls,
            };
        }
    }
    // Shadow
    if (SHADOW_VALUES[unprefixed]) {
        return {
            property: "box-shadow",
            value: SHADOW_VALUES[unprefixed],
            rawClass: cls,
        };
    }
    // Border radius
    if (RADIUS_VALUES[unprefixed]) {
        return {
            property: "border-radius",
            value: RADIUS_VALUES[unprefixed],
            rawClass: cls,
        };
    }
    // rounded-t-*, rounded-b-*, etc.
    const roundedDirectionMatch = unprefixed.match(/^rounded-(t|b|l|r|tl|tr|bl|br)(?:-(none|sm|md|lg|xl|2xl|3xl|full))?$/);
    if (roundedDirectionMatch) {
        const size = roundedDirectionMatch[2] ?? "";
        const baseKey = size ? `rounded-${size}` : "rounded";
        const resolvedVal = RADIUS_VALUES[baseKey];
        if (resolvedVal) {
            return {
                property: "border-radius",
                value: resolvedVal,
                rawClass: cls,
            };
        }
    }
    // Font family
    if (FONT_FAMILY_VALUES[unprefixed]) {
        return {
            property: "font-family",
            value: FONT_FAMILY_VALUES[unprefixed],
            rawClass: cls,
        };
    }
    // Gradient classes
    if (unprefixed.startsWith("bg-gradient-")) {
        return {
            property: "background-image",
            value: `linear-gradient(${unprefixed.replace("bg-gradient-to-", "to ")})`,
            rawClass: cls,
        };
    }
    if (unprefixed.startsWith("from-") || unprefixed.startsWith("via-") || unprefixed.startsWith("to-")) {
        // Gradient color stops — we'll capture these as gradient-related facts
        return {
            property: "background-image",
            value: `gradient-stop(${unprefixed})`,
            rawClass: cls,
        };
    }
    return null;
}
/**
 * Parse a Tailwind color class (text-*, bg-*, border-*, ring-*).
 * Returns the color token or null.
 */
function parseTailwindColorClass(cls) {
    const unprefixed = cls.replace(/^(?:\w+:)*/, "");
    // Color classes: text-{color}-{shade}, bg-{color}-{shade}, border-{color}-{shade}, ring-{color}-{shade}
    const colorMatch = unprefixed.match(/^(text|bg|border|ring|outline|accent|decoration|fill|stroke)-(.+)$/);
    if (!colorMatch)
        return null;
    const [, prefix, colorPart] = colorMatch;
    // Skip non-color utility classes
    const nonColorPrefixes = {
        text: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl", "left", "center", "right", "justify", "start", "end", "wrap", "nowrap", "ellipsis", "clip"],
        bg: ["gradient", "no-repeat", "repeat", "cover", "contain", "center", "top", "bottom", "left", "right", "fixed", "local", "scroll", "clip", "origin", "none"],
        border: ["0", "2", "4", "8", "t", "b", "l", "r", "x", "y", "solid", "dashed", "dotted", "double", "hidden", "none", "collapse", "separate", "spacing"],
        ring: ["0", "1", "2", "4", "8", "inset", "offset"],
    };
    if (nonColorPrefixes[prefix]?.some((p) => colorPart === p || colorPart.startsWith(p + "-"))) {
        // Check for specific cases like border-2 (not a color) vs border-red-500 (a color)
        // If it matches a known non-color value, skip
        return null;
    }
    // Check if this maps to a known Tailwind color
    if (TAILWIND_COLORS[colorPart] || colorPart === "black" || colorPart === "white" || colorPart === "transparent" || colorPart === "current") {
        const propertyMap = {
            text: "color",
            bg: "background-color",
            border: "border-color",
            ring: "outline-color",
            outline: "outline-color",
            accent: "accent-color",
            decoration: "text-decoration-color",
            fill: "fill",
            stroke: "stroke",
        };
        return {
            property: propertyMap[prefix] ?? "color",
            token: colorPart,
        };
    }
    return null;
}
/**
 * Extract className strings from a source file.
 * Uses regex to find className="..." and className={`...`} and className={cn(...)} patterns.
 */
function extractClassNames(content) {
    const results = [];
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match className="..." and class="..."
        const staticPattern = /(?:className|class)\s*=\s*"([^"]+)"/g;
        let match;
        while ((match = staticPattern.exec(line)) !== null) {
            results.push({ classes: match[1], line: i + 1 });
        }
        // Match className='...'
        const singleQuotePattern = /(?:className|class)\s*=\s*'([^']+)'/g;
        while ((match = singleQuotePattern.exec(line)) !== null) {
            results.push({ classes: match[1], line: i + 1 });
        }
        // Match className={`...`} (template literals)
        const templatePattern = /(?:className|class)\s*=\s*\{`([^`]+)`\}/g;
        while ((match = templatePattern.exec(line)) !== null) {
            // Remove template expression parts ${...}
            const cleaned = match[1].replace(/\$\{[^}]+\}/g, " ");
            results.push({ classes: cleaned, line: i + 1 });
        }
        // Match className={cn("...")} or clsx("...") etc. — extract string args
        const cnPattern = /(?:className|class)\s*=\s*\{(?:cn|clsx|classNames|twMerge)\(([^)]+)\)/g;
        while ((match = cnPattern.exec(line)) !== null) {
            // Extract string literals from the function args
            const stringPattern = /["']([^"']+)["']/g;
            let strMatch;
            while ((strMatch = stringPattern.exec(match[1])) !== null) {
                results.push({ classes: strMatch[1], line: i + 1 });
            }
        }
    }
    return results;
}
/**
 * Extract @apply directives from CSS content.
 */
function extractApplyDirectives(content, file) {
    const results = [];
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/@apply\s+(.+?)(?:\s*;|\s*$)/);
        if (match) {
            results.push({ classes: match[1], line: i + 1 });
        }
    }
    return results;
}
/**
 * Detect the component name from a file path.
 */
function detectComponent(filePath) {
    const match = filePath.match(/([A-Z][a-zA-Z0-9]*)\.\w+$/);
    return match?.[1];
}
/**
 * Read tailwind.config.js/ts and count custom theme entries.
 */
export function readTailwindConfig(projectRoot) {
    const configFiles = [
        "tailwind.config.js",
        "tailwind.config.ts",
        "tailwind.config.cjs",
        "tailwind.config.mjs",
    ];
    for (const configFile of configFiles) {
        const configPath = join(projectRoot, configFile);
        if (!existsSync(configPath))
            continue;
        try {
            const content = readFileSync(configPath, "utf-8");
            // Count theme.extend entries (rough heuristic via regex)
            let customEntryCount = 0;
            // Count color entries in theme.extend.colors
            const extendBlock = content.match(/extend\s*:\s*\{([\s\S]*)\}/);
            if (extendBlock) {
                // Count key-value pairs (rough approximation)
                const entries = extendBlock[1].match(/["']\w+["']\s*:/g);
                customEntryCount = entries?.length ?? 0;
            }
            // Also count top-level theme overrides
            const themeBlock = content.match(/theme\s*:\s*\{([\s\S]*?)\n\s*\}/);
            if (themeBlock && !extendBlock) {
                const entries = themeBlock[1].match(/["']\w+["']\s*:/g);
                customEntryCount = entries?.length ?? 0;
            }
            // Extract custom color definitions (best-effort)
            const customColors = {};
            const colorPattern = /["'](\w[\w-]*)["']\s*:\s*["'](#[0-9a-fA-F]{3,8})["']/g;
            let colorMatch;
            while ((colorMatch = colorPattern.exec(content)) !== null) {
                customColors[colorMatch[1]] = colorMatch[2];
            }
            return { customEntryCount, customColors };
        }
        catch {
            // Config couldn't be read/parsed
            continue;
        }
    }
    return { customEntryCount: 0, customColors: {} };
}
/**
 * Parse a file's content and extract Tailwind-related facts.
 */
export function parseTailwindFile(content, file) {
    const facts = [];
    const colors = [];
    const component = detectComponent(file);
    // Parse suppressions
    const suppressions = parseSuppressions(content, file);
    // Extract className attributes
    const classNameEntries = extractClassNames(content);
    // Also extract @apply directives if this looks like a CSS file
    if (file.endsWith(".css") || file.endsWith(".scss") || file.endsWith(".sass")) {
        classNameEntries.push(...extractApplyDirectives(content, file));
    }
    for (const entry of classNameEntries) {
        const classList = entry.classes.split(/\s+/).filter((c) => c.length > 0);
        for (const cls of classList) {
            // Try to parse as a style class
            const parsed = parseTailwindClass(cls);
            if (parsed) {
                facts.push({
                    property: parsed.property,
                    value: parsed.value,
                    rawValue: cls,
                    source: "tailwind",
                    file,
                    line: entry.line,
                    component,
                    confidence: "high",
                });
            }
            // Try to parse as a color class
            const colorParsed = parseTailwindColorClass(cls);
            if (colorParsed) {
                const resolved = resolveTailwindColor(colorParsed.token);
                facts.push({
                    property: colorParsed.property,
                    value: resolved?.hex ?? colorParsed.token,
                    rawValue: cls,
                    source: "tailwind",
                    file,
                    line: entry.line,
                    component,
                    confidence: resolved ? "high" : "medium",
                });
                if (resolved) {
                    colors.push({
                        hex: resolved.hex,
                        hsl: resolved.hsl,
                        token: colorParsed.token,
                        source: "tailwind",
                        file,
                        line: entry.line,
                        confidence: "high",
                    });
                }
                else {
                    colors.push({
                        token: colorParsed.token,
                        source: "tailwind",
                        file,
                        line: entry.line,
                        confidence: "medium",
                    });
                }
            }
        }
    }
    return { facts, colors, suppressions };
}
/**
 * Run the Tailwind extractor over a list of files.
 */
export function extractTailwind(files, _projectRoot) {
    const allFacts = [];
    const allColors = [];
    const allSuppressions = [];
    const errors = [];
    let filesParsed = 0;
    for (const file of files) {
        try {
            const content = readFileSync(file, "utf-8");
            const result = parseTailwindFile(content, file);
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
        name: "tailwind",
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
        note: errors.length > 0
            ? `${errors.length} files contain dynamic class expressions`
            : undefined,
    };
}
//# sourceMappingURL=tailwind.js.map