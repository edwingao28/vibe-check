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
import type { Node } from "@babel/types";
import type { StyleFact, ColorFact, SuppressionFact } from "../ir/types.js";
import type { ExtractorResult, ExtractorError } from "./types.js";
import { resolveColor, isColorValue } from "./utils/color-resolver.js";
import { parseSuppressions } from "./utils/suppression-parser.js";

// Handle both ESM default and CJS module.exports for @babel/traverse
const traverse = (typeof _traverse === "function" ? _traverse : (_traverse as { default: typeof _traverse }).default) as typeof _traverse;

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
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Detect the component name from a file path.
 */
function detectComponent(filePath: string): string | undefined {
  const match = filePath.match(/([A-Z][a-zA-Z0-9]*)\.\w+$/);
  return match?.[1];
}

/**
 * Extract a static value from a Babel AST node.
 * Returns the string value and confidence level.
 */
function extractStaticValue(
  node: Node
): { value: string; confidence: "high" | "medium" | "low" } | null {
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

/**
 * Parse a JSX/TSX file and extract inline style facts.
 */
export function parseInlineStyles(
  content: string,
  file: string
): {
  facts: StyleFact[];
  colors: ColorFact[];
  suppressions: SuppressionFact[];
} {
  const facts: StyleFact[] = [];
  const colors: ColorFact[] = [];
  const component = detectComponent(file);

  // Parse suppressions from raw source
  const suppressions = parseSuppressions(content, file);

  // Determine if this is TypeScript/TSX
  const isTypeScript = file.endsWith(".ts") || file.endsWith(".tsx");
  const isJSX = file.endsWith(".tsx") || file.endsWith(".jsx");

  let ast: ReturnType<typeof babelParse>;
  try {
    ast = babelParse(content, {
      sourceType: "module",
      plugins: [
        ...(isJSX ? ["jsx" as const] : []),
        ...(isTypeScript ? ["typescript" as const] : []),
        "decorators-legacy" as const,
        "classProperties" as const,
        "optionalChaining" as const,
        "nullishCoalescingOperator" as const,
      ],
      errorRecovery: true,
    });
  } catch {
    // If parsing fails completely, return empty results
    return { facts, colors, suppressions };
  }

  traverse(ast, {
    JSXAttribute(path) {
      // Look for style={...} attributes
      if (
        path.node.name.type === "JSXIdentifier" &&
        path.node.name.name === "style" &&
        path.node.value?.type === "JSXExpressionContainer"
      ) {
        const expression = path.node.value.expression;

        if (expression.type === "ObjectExpression") {
          // style={{ ... }} — direct object expression
          processObjectExpression(expression, file, component, facts, colors);
        } else if (expression.type === "Identifier" || expression.type === "MemberExpression") {
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
  });

  return { facts, colors, suppressions };
}

/**
 * Process an ObjectExpression node from style={{...}} and extract facts.
 */
function processObjectExpression(
  node: Node & { type: "ObjectExpression" },
  file: string,
  component: string | undefined,
  facts: StyleFact[],
  colors: ColorFact[]
): void {
  for (const prop of node.properties) {
    if (prop.type !== "ObjectProperty") continue;

    // Get the property name
    let propName: string | null = null;
    if (prop.key.type === "Identifier") {
      propName = prop.key.name;
    } else if (prop.key.type === "StringLiteral") {
      propName = prop.key.value;
    }
    if (!propName) continue;

    const cssProp = camelToKebab(propName);
    const line = prop.loc?.start.line ?? 0;

    // Extract the value
    const extracted = extractStaticValue(prop.value);
    if (!extracted) continue;

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
export function extractInlineStyles(files: string[]): ExtractorResult {
  const allFacts: StyleFact[] = [];
  const allColors: ColorFact[] = [];
  const allSuppressions: SuppressionFact[] = [];
  const errors: ExtractorError[] = [];
  let filesParsed = 0;

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const result = parseInlineStyles(content, file);
      allFacts.push(...result.facts);
      allColors.push(...result.colors);
      allSuppressions.push(...result.suppressions);
      filesParsed++;
    } catch (err) {
      errors.push({
        file,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const coverage = files.length > 0 ? filesParsed / files.length : 1;

  return {
    name: "inline",
    status:
      files.length === 0
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
