#!/usr/bin/env node

/**
 * slop-scan CLI entry point.
 *
 * Usage: slop-scan [path] [--verbose] [--json] [--deep] [--full] [--no-cache] [--help]
 *
 * Pipeline: resolve scope -> run extractors -> build IR -> run signals ->
 *           compute intent -> attenuate -> aggregate -> report -> output JSON
 */

import { parseArgs } from "node:util";
import { resolve, extname } from "node:path";
import { writeFileSync } from "node:fs";

import { loadConfig } from "./config/loader.js";
import { resolveScope } from "./scope/resolver.js";
import { IRStore } from "./ir/store.js";
import { generateReport } from "./output/json-reporter.js";
import { generateMarkdownReport } from "./output/md-reporter.js";

// Extractors
import { extractCss } from "./extractors/css.js";
import { extractTailwind } from "./extractors/tailwind.js";
import { extractInlineStyles } from "./extractors/inline.js";
import { extractCssModules } from "./extractors/css-module.js";

// Signals
import { runSignals } from "./signals/registry.js";

// Scoring
import { aggregate } from "./scoring/aggregator.js";
import { calculateIntent } from "./scoring/intent.js";
import { applyAttenuation } from "./scoring/attenuation.js";
import { getBand, getConfidence } from "./scoring/bands.js";

import type { ScoringResult } from "./scoring/types.js";

const HELP_TEXT = `
slop-scan — Detect AI-generated slop in web projects

Usage:
  slop-scan [path] [flags]

Arguments:
  path              Directory or file to scan (default: smart UI scope detection)

Flags:
  --verbose         Full signal details, all evidence, file:line references
  --json            Raw JSON output (schema v1)
  --deep            Enable LLM-assisted Tier 2 deep scan (no-op in v1)
  --full            Scan entire project (ignore smart scope detection)
  --no-cache        Disable cache for this run (no-op in v1)
  --help            Show this help message

Examples:
  slop-scan                     Smart scope scan of current directory
  slop-scan src/                Scan src/ directory
  slop-scan --full --verbose    Full project scan with verbose output
  slop-scan apps/marketing      Scan a specific app in a monorepo
`.trim();

async function main(): Promise<void> {
  // Parse CLI arguments
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      verbose: { type: "boolean", default: false },
      json: { type: "boolean", default: false },

      deep: { type: "boolean", default: false },
      full: { type: "boolean", default: false },
      "no-cache": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  // --help
  if (values.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  // --deep and --no-cache are accepted but no-op in v1
  if (values.deep) {
    console.error(
      "Note: --deep flag is accepted but is a no-op in v1. Deep scan requires LLM integration.",
    );
  }
  if (values["no-cache"]) {
    console.error(
      "Note: --no-cache flag is accepted but is a no-op in v1. Caching is not yet implemented.",
    );
  }

  const startTime = Date.now();

  // Determine project root (cwd) and optional user path
  const projectRoot = process.cwd();
  const userPath = positionals[0];

  // Collect flags for report metadata
  const flags: string[] = [];
  if (values.verbose) flags.push("--verbose");
  if (values.json) flags.push("--json");

  if (values.deep) flags.push("--deep");
  if (values.full) flags.push("--full");
  if (values["no-cache"]) flags.push("--no-cache");

  // 1. Load config
  const { config, configFile } = loadConfig(projectRoot);

  // 2. Resolve scope
  const scopeResult = resolveScope(projectRoot, userPath, values.full, config);

  // 3. Run extractors on scoped files -> feed into IRStore
  const irStore = new IRStore();

  // Partition files by type for the appropriate extractor
  const cssFiles: string[] = [];
  const cssModuleFiles: string[] = [];
  const jsxTsxFiles: string[] = [];

  for (const file of scopeResult.files) {
    const fullPath = resolve(projectRoot, file);
    const ext = extname(file);

    if (
      file.endsWith(".module.css") ||
      file.endsWith(".module.scss") ||
      file.endsWith(".module.sass")
    ) {
      cssModuleFiles.push(fullPath);
    } else if (ext === ".css" || ext === ".scss" || ext === ".sass") {
      cssFiles.push(fullPath);
    }

    if (
      ext === ".tsx" ||
      ext === ".jsx" ||
      ext === ".ts" ||
      ext === ".js" ||
      ext === ".mdx"
    ) {
      jsxTsxFiles.push(fullPath);
    }
  }

  // Run CSS extractor
  if (cssFiles.length > 0) {
    const cssResult = extractCss(cssFiles);
    irStore.addExtractorResult(cssResult);
  }

  // Run Tailwind extractor
  if (jsxTsxFiles.length > 0) {
    try {
      const tailwindResult = extractTailwind(jsxTsxFiles);
      irStore.addExtractorResult(tailwindResult);
    } catch {
      // Tailwind extractor failed — skip gracefully
    }
  }

  // Run Inline style extractor
  if (jsxTsxFiles.length > 0) {
    try {
      const inlineResult = extractInlineStyles(jsxTsxFiles);
      irStore.addExtractorResult(inlineResult);
    } catch {
      // Inline extractor failed — skip gracefully
    }
  }

  // Run CSS Module extractor
  if (cssModuleFiles.length > 0) {
    try {
      const cssModuleResult = extractCssModules(cssModuleFiles);
      irStore.addExtractorResult(cssModuleResult);
    } catch {
      // CSS Module extractor failed — skip gracefully
    }
  }

  // 4. Run signals via registry
  const signalContext = {
    facts: irStore.facts,
    colors: irStore.colors,
    texts: irStore.texts,
    structures: irStore.structures,
    suppressions: irStore.suppressions,
    extractorHealth: irStore.extractorHealth,
    config,
    fileList: scopeResult.files,
    projectRoot,
  };

  const signalResults = runSignals(signalContext, config);

  // 5. Calculate intent
  const intentResult = calculateIntent(irStore.facts, scopeResult.files);

  // 6. Apply attenuation
  const attenuatedSignals = applyAttenuation(signalResults, intentResult.tier);

  // 7. Aggregate scores
  const { slopScore, categories } = aggregate(attenuatedSignals, config);

  // 8. Derive band and confidence
  const band = getBand(slopScore);
  const coverage = irStore.getCoverage();
  const extractorStatuses = irStore.getExtractorResults().map((r) => r.status);
  const excludedCategories = categories.filter((c) =>
    Number.isNaN(c.score),
  ).length;
  const confidence = getConfidence(
    coverage.overallCoverage,
    extractorStatuses,
    excludedCategories,
  );

  // Build the full ScoringResult
  const scoringResult: ScoringResult = {
    slopScore: Math.round(slopScore * 100) / 100,
    band,
    confidence,
    categories,
    intent: intentResult,
    signals: attenuatedSignals,
  };

  // 9. Generate report
  const duration = Date.now() - startTime;
  const report = generateReport({
    scoringResult,
    irStore,
    scopeResult,
    configFile,
    duration,
    flags,
    verbose: values.verbose,
  });

  // 10. Output to stdout
  const output = JSON.stringify(report, null, values.json ? 2 : 2);
  console.log(output);

  // 11. Write markdown report (always)
  const mdPath = resolve(projectRoot, "slop-report.md");
  const markdown = generateMarkdownReport(report);
  writeFileSync(mdPath, markdown, "utf-8");
  console.error(`Markdown report written to ${mdPath}`);

  // Exit code 0 always (exit codes are a v2 feature)
  process.exit(0);
}

main().catch((err) => {
  console.error("slop-scan error:", err);
  process.exit(1);
});
