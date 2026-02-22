/**
 * Inline Style Extractor — Uses @babel/parser to parse JSX/TSX
 * and extract style={{...}} expressions as StyleFact[] and ColorFact[].
 *
 * Static key-value pairs are extracted with high confidence.
 * Dynamic/computed values are tagged as low confidence.
 */
import { readFileSync } from "node:fs";
import { parse as babelParse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { resolveColor, isColorValue } from "./utils/color-resolver.js";
import { parseSuppressions } from "./utils/suppression-parser.js";
// Handle both ESM default and CJS module.exports for @babel/traverse
const traverse = (typeof _traverse === "function" ? _traverse : _traverse.default);
/** CSS properties that represent colors (camelCase for JSX) */
const COLOR_PROPERTIES_CAMEL = new Set([
    "color",
    "backgroundColor",
    "borderColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "outlineColor",
    "textDecorationColor",
    "fill",
    "stroke",
    "caretColor",
    "accentColor",
]);
/** Map camelCase JSX style properties to CSS kebab-case */
function camelToKebab(str) {
    return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
/**
 * Detect the component name from a file path.
 */
function detectComponent(filePath) {
    const match = filePath.match(/([A-Z][a-zA-Z0-9]*)\.\w+$/);
    return match?.[1];
}
/**
 * Extract a static value from a Babel AST node.
 * Returns the string value and confidence level.
 */
function extractStaticValue(node) {
    switch (node.type) {
        case "StringLiteral":
            return { value: node.value, confidence: "high" };
        case "NumericLiteral":
            return { value: `${node.value}px`, confidence: "high" };
        case "TemplateLiteral":
            if (node.expressions.length === 0 && node.quasis.length === 1) {
                return { value: node.quasis[0].value.cooked ?? node.quasis[0].value.raw, confidence: "high" };
            }
            // Template with expressions — low confidence
            return { value: node.quasis.map((q) => q.value.raw).join("?"), confidence: "low" };
        case "UnaryExpression":
            if (node.operator === "-" && node.argument.type === "NumericLiteral") {
                return { value: `${-node.argument.value}px`, confidence: "high" };
            }
            return { value: "dynamic", confidence: "low" };
        case "Identifier":
            // Variable reference — we can't resolve it
            return { value: `var(${node.name})`, confidence: "low" };
        case "MemberExpression":
            return { value: "dynamic", confidence: "low" };
        case "ConditionalExpression":
            return { value: "dynamic", confidence: "low" };
        case "CallExpression":
            return { value: "dynamic", confidence: "low" };
        default:
            return null;
    }
}
/** HTML elements that carry semantic text content */
const TEXT_ELEMENTS = {
    h1: "heading",
    h2: "heading",
    h3: "heading",
    h4: "heading",
    h5: "heading",
    h6: "heading",
    p: "paragraph",
    button: "button",
    a: "link",
    span: "other",
    label: "other",
};
/** P3: Known component names that carry text content (PascalCase) */
const SEMANTIC_COMPONENTS = {
    Button: "button",
    Link: "link",
    NavLink: "link",
    RouterLink: "link",
    CardTitle: "heading",
    CardDescription: "paragraph",
    DialogTitle: "heading",
    DialogDescription: "paragraph",
    AlertTitle: "heading",
    AlertDescription: "paragraph",
    Title: "heading",
    Heading: "heading",
    Text: "paragraph",
    Badge: "other",
    Label: "other",
};
/** P0: JSX attribute names that commonly carry text content */
const TEXT_PROP_NAMES = new Set([
    "title",
    "description",
    "label",
    "placeholder",
    "alt",
    "aria-label",
    "heading",
    "subtitle",
    "caption",
]);
/** Section type classification keywords mapped to StructuralFact sectionType */
const SECTION_KEYWORDS = [
    [/hero/i, "hero"],
    [/feature/i, "feature-grid"],
    [/testimonial/i, "testimonial-section"],
    [/pricing/i, "pricing"],
    [/cta|call-to-action|calltoaction/i, "cta-block"],
    [/footer/i, "footer"],
    [/stats/i, "stats"],
    [/faq/i, "faq"],
    [/contact/i, "contact"],
    [/about/i, "about"],
];
/**
 * Extract static text content from JSX children.
 * Concatenates StringLiteral, JSXText, and JSXExpressionContainer(StringLiteral).
 * Skips dynamic expressions (variables, function calls).
 */
function extractTextFromChildren(children) {
    const parts = [];
    for (const child of children) {
        switch (child.type) {
            case "JSXText": {
                const trimmed = child.value.replace(/\s+/g, " ").trim();
                if (trimmed)
                    parts.push(trimmed);
                break;
            }
            case "JSXExpressionContainer": {
                if (child.expression.type === "StringLiteral") {
                    if (child.expression.value.trim()) {
                        parts.push(child.expression.value.trim());
                    }
                }
                // Skip dynamic expressions (Identifier, CallExpression, etc.)
                break;
            }
            // Recurse into nested JSX elements to capture their text too
            case "JSXElement": {
                const nestedText = extractTextFromChildren(child.children);
                if (nestedText)
                    parts.push(nestedText);
                break;
            }
            case "JSXFragment": {
                const fragText = extractTextFromChildren(child.children);
                if (fragText)
                    parts.push(fragText);
                break;
            }
        }
    }
    return parts.join(" ");
}
/**
 * Get the tag name from a JSXElement's opening element.
 * Returns the simple name for JSXIdentifier (e.g., "div", "h1", "HeroSection").
 * Returns null for member expressions and namespaced names.
 */
function getTagName(opening) {
    if (opening.name.type === "JSXIdentifier") {
        return opening.name.name;
    }
    return null;
}
/**
 * Extract the className string value from a JSXElement's attributes.
 */
function getClassName(opening) {
    for (const attr of opening.attributes) {
        if (attr.type === "JSXAttribute" &&
            attr.name.type === "JSXIdentifier" &&
            attr.name.name === "className" &&
            attr.value) {
            if (attr.value.type === "StringLiteral") {
                return attr.value.value;
            }
            if (attr.value.type === "JSXExpressionContainer" &&
                attr.value.expression.type === "StringLiteral") {
                return attr.value.expression.value;
            }
            if (attr.value.type === "JSXExpressionContainer" &&
                attr.value.expression.type === "TemplateLiteral" &&
                attr.value.expression.expressions.length === 0 &&
                attr.value.expression.quasis.length === 1) {
                return attr.value.expression.quasis[0].value.cooked ?? attr.value.expression.quasis[0].value.raw;
            }
        }
    }
    return null;
}
/**
 * Extract the id string value from a JSXElement's attributes.
 */
function getId(opening) {
    for (const attr of opening.attributes) {
        if (attr.type === "JSXAttribute" &&
            attr.name.type === "JSXIdentifier" &&
            attr.name.name === "id" &&
            attr.value) {
            if (attr.value.type === "StringLiteral") {
                return attr.value.value;
            }
        }
    }
    return null;
}
/**
 * Classify a section type based on a tag name, className, and id.
 */
function classifySectionType(tagName, className, id) {
    // Check tag/component name first
    for (const [pattern, sectionType] of SECTION_KEYWORDS) {
        if (pattern.test(tagName))
            return sectionType;
    }
    // Check className
    if (className) {
        for (const [pattern, sectionType] of SECTION_KEYWORDS) {
            if (pattern.test(className))
                return sectionType;
        }
    }
    // Check id attribute
    if (id) {
        for (const [pattern, sectionType] of SECTION_KEYWORDS) {
            if (pattern.test(id))
                return sectionType;
        }
    }
    return "unknown";
}
/**
 * Check whether a JSXElement's direct JSX children match the
 * hero heuristic: exactly 1 heading + 1 paragraph + 1 button.
 */
function matchesHeroHeuristic(children) {
    let headings = 0;
    let paragraphs = 0;
    let buttons = 0;
    for (const child of children) {
        if (child.type !== "JSXElement")
            continue;
        const name = getTagName(child.openingElement);
        if (!name)
            continue;
        if (/^h[1-6]$/.test(name))
            headings++;
        else if (name === "p")
            paragraphs++;
        else if (name === "button")
            buttons++;
    }
    return headings === 1 && paragraphs === 1 && buttons === 1;
}
/**
 * Parse a JSX/TSX file and extract inline style facts.
 */
export function parseInlineStyles(content, file) {
    const facts = [];
    const colors = [];
    const texts = [];
    const structures = [];
    const component = detectComponent(file);
    // Parse suppressions from raw source
    const suppressions = parseSuppressions(content, file);
    // Determine if this is TypeScript/TSX
    const isTypeScript = file.endsWith(".ts") || file.endsWith(".tsx");
    const isJSX = file.endsWith(".tsx") || file.endsWith(".jsx");
    let ast;
    try {
        ast = babelParse(content, {
            sourceType: "module",
            plugins: [
                ...(isJSX ? ["jsx"] : []),
                ...(isTypeScript ? ["typescript"] : []),
                "decorators-legacy",
                "classProperties",
                "optionalChaining",
                "nullishCoalescingOperator",
            ],
            errorRecovery: true,
        });
    }
    catch {
        // If parsing fails completely, return empty results
        return { facts, colors, texts, structures, suppressions };
    }
    traverse(ast, {
        JSXAttribute(path) {
            // Look for style={...} attributes
            if (path.node.name.type === "JSXIdentifier" &&
                path.node.name.name === "style" &&
                path.node.value?.type === "JSXExpressionContainer") {
                const expression = path.node.value.expression;
                if (expression.type === "ObjectExpression") {
                    // style={{ ... }} — direct object expression
                    processObjectExpression(expression, file, component, facts, colors);
                }
                else if (expression.type === "Identifier" || expression.type === "MemberExpression") {
                    // style={styles.container} or style={myStyle} — variable reference
                    const line = expression.loc?.start.line ?? 0;
                    facts.push({
                        property: "style-ref",
                        value: "dynamic",
                        rawValue: content.slice(expression.start ?? 0, expression.end ?? 0),
                        source: "inline",
                        file,
                        line,
                        component,
                        confidence: "low",
                    });
                }
            }
        },
        JSXElement(path) {
            const opening = path.node.openingElement;
            const tagName = getTagName(opening);
            if (!tagName)
                return;
            const line = opening.loc?.start.line ?? 0;
            // --- TextFact extraction ---
            const textContext = TEXT_ELEMENTS[tagName];
            if (textContext) {
                const text = extractTextFromChildren(path.node.children);
                const hasChildren = path.node.children.length > 0;
                // Emit TextFact even for dynamic children (e.g., <h3>{title}</h3>)
                // so structural signals like Card Carnival can detect the pattern
                if (text || hasChildren) {
                    texts.push({
                        text: text || "(dynamic)",
                        context: textContext,
                        file,
                        line,
                        component,
                    });
                }
            }
            // --- P0: Extract text from JSX attributes (title=, description=, etc.) ---
            for (const attr of opening.attributes) {
                if (attr.type === "JSXAttribute" &&
                    attr.name.type === "JSXIdentifier" &&
                    TEXT_PROP_NAMES.has(attr.name.name) &&
                    attr.value) {
                    let propText = null;
                    if (attr.value.type === "StringLiteral") {
                        propText = attr.value.value;
                    }
                    else if (attr.value.type === "JSXExpressionContainer" &&
                        attr.value.expression.type === "StringLiteral") {
                        propText = attr.value.expression.value;
                    }
                    if (propText && propText.trim()) {
                        texts.push({
                            text: propText.trim(),
                            context: "other",
                            file,
                            line,
                            component,
                        });
                    }
                }
            }
            // --- P3: Extract text from known semantic components ---
            const componentContext = SEMANTIC_COMPONENTS[tagName];
            if (componentContext) {
                const text = extractTextFromChildren(path.node.children);
                if (text) {
                    texts.push({
                        text,
                        context: componentContext,
                        file,
                        line,
                        component,
                    });
                }
            }
            // --- Image src extraction (for Stock Photo Syndrome) ---
            if (tagName === "img" || tagName === "Image" || tagName === "Img") {
                for (const attr of opening.attributes) {
                    if (attr.type === "JSXAttribute" &&
                        attr.name.type === "JSXIdentifier" &&
                        attr.name.name === "src" &&
                        attr.value) {
                        let srcValue = null;
                        if (attr.value.type === "StringLiteral") {
                            srcValue = attr.value.value;
                        }
                        else if (attr.value.type === "JSXExpressionContainer" &&
                            attr.value.expression.type === "StringLiteral") {
                            srcValue = attr.value.expression.value;
                        }
                        if (srcValue && srcValue.trim()) {
                            texts.push({
                                text: srcValue.trim(),
                                context: "other",
                                file,
                                line,
                                component,
                            });
                        }
                    }
                }
            }
            // --- StructuralFact extraction ---
            // P2: Emit for <section>, <main>, <header>, <nav>, <footer>, <aside>, or PascalCase components
            const isSection = tagName === "section" || tagName === "main" ||
                tagName === "header" || tagName === "nav" ||
                tagName === "footer" || tagName === "aside";
            const isCustomComponent = /^[A-Z]/.test(tagName);
            // P1: Also check divs whose className or id matches a section keyword
            const className = getClassName(opening);
            const elId = getId(opening);
            const divMatchesKeyword = tagName === "div" && ((className != null && SECTION_KEYWORDS.some(([pattern]) => pattern.test(className))) ||
                (elId != null && SECTION_KEYWORDS.some(([pattern]) => pattern.test(elId))));
            if (isSection || isCustomComponent || divMatchesKeyword) {
                let sectionType = classifySectionType(tagName, className, elId);
                // Content heuristic: if still "unknown" and has exactly
                // 1 heading + 1 paragraph + 1 button → classify as "hero"
                if (sectionType === "unknown" && matchesHeroHeuristic(path.node.children)) {
                    sectionType = "hero";
                }
                // Emit for semantic elements, keyword-matched divs, or classified components
                if (isSection || divMatchesKeyword || sectionType !== "unknown") {
                    structures.push({
                        sectionType,
                        file,
                        line,
                        component,
                    });
                }
            }
        },
    });
    return { facts, colors, texts, structures, suppressions };
}
/**
 * Process an ObjectExpression node from style={{...}} and extract facts.
 */
function processObjectExpression(node, file, component, facts, colors) {
    for (const prop of node.properties) {
        if (prop.type !== "ObjectProperty")
            continue;
        // Get the property name
        let propName = null;
        if (prop.key.type === "Identifier") {
            propName = prop.key.name;
        }
        else if (prop.key.type === "StringLiteral") {
            propName = prop.key.value;
        }
        if (!propName)
            continue;
        const cssProp = camelToKebab(propName);
        const line = prop.loc?.start.line ?? 0;
        // Extract the value
        const extracted = extractStaticValue(prop.value);
        if (!extracted)
            continue;
        facts.push({
            property: cssProp,
            value: extracted.value,
            rawValue: `${propName}: ${extracted.value}`,
            source: "inline",
            file,
            line,
            component,
            confidence: extracted.confidence,
        });
        // Check if this is a color property with a resolvable value
        if (COLOR_PROPERTIES_CAMEL.has(propName) && extracted.confidence !== "low") {
            if (isColorValue(extracted.value)) {
                const resolved = resolveColor(extracted.value);
                if (resolved) {
                    colors.push({
                        hex: resolved.hex,
                        hsl: resolved.hsl,
                        source: "inline",
                        file,
                        line,
                        confidence: extracted.confidence,
                    });
                }
            }
        }
    }
}
/**
 * Run the inline style extractor over a list of JSX/TSX files.
 */
export function extractInlineStyles(files) {
    const allFacts = [];
    const allColors = [];
    const allTexts = [];
    const allStructures = [];
    const allSuppressions = [];
    const errors = [];
    let filesParsed = 0;
    for (const file of files) {
        try {
            const content = readFileSync(file, "utf-8");
            const result = parseInlineStyles(content, file);
            allFacts.push(...result.facts);
            allColors.push(...result.colors);
            allTexts.push(...result.texts);
            allStructures.push(...result.structures);
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
        name: "inline",
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
        texts: allTexts,
        structures: allStructures,
        suppressions: allSuppressions,
        errors,
    };
}
//# sourceMappingURL=inline.js.map