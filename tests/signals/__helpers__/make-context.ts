/**
 * Factory for creating SignalContext objects in tests.
 *
 * Provides sensible defaults (healthy extractors, default config, empty facts)
 * with the ability to override any field.
 */

import type { SignalContext } from "../../../src/signals/types.js";
import type {
  StyleFact,
  ColorFact,
  TextFact,
  StructuralFact,
  SuppressionFact,
} from "../../../src/ir/types.js";
import type { ExtractorStatus } from "../../../src/extractors/types.js";
import type { SlopConfig } from "../../../src/config/types.js";
import { DEFAULT_CONFIG } from "../../../src/config/defaults.js";

export interface MakeContextOptions {
  facts?: StyleFact[];
  colors?: ColorFact[];
  texts?: TextFact[];
  structures?: StructuralFact[];
  suppressions?: SuppressionFact[];
  extractorHealth?: Record<string, ExtractorStatus>;
  config?: Partial<SlopConfig>;
  fileList?: string[];
  projectRoot?: string;
}

/**
 * Create a SignalContext with sensible test defaults.
 *
 * By default all extractors (css, tailwind, inline, css-module) are "healthy",
 * config uses DEFAULT_CONFIG, and all fact arrays are empty.
 */
export function makeContext(opts: MakeContextOptions = {}): SignalContext {
  const healthMap = new Map<string, ExtractorStatus>();
  const defaultHealth: Record<string, ExtractorStatus> = {
    css: "healthy",
    tailwind: "healthy",
    inline: "healthy",
    "css-module": "healthy",
  };
  const healthEntries = opts.extractorHealth ?? defaultHealth;
  for (const [key, status] of Object.entries(healthEntries)) {
    healthMap.set(key, status);
  }

  const config: SlopConfig = opts.config
    ? {
        ...DEFAULT_CONFIG,
        ...opts.config,
        signals: { ...DEFAULT_CONFIG.signals, ...opts.config.signals },
        intent: { ...DEFAULT_CONFIG.intent, ...opts.config.intent },
        scope: { ...DEFAULT_CONFIG.scope, ...opts.config.scope },
        suppressions: {
          ...DEFAULT_CONFIG.suppressions,
          ...opts.config.suppressions,
        },
      }
    : DEFAULT_CONFIG;

  return {
    facts: opts.facts ?? [],
    colors: opts.colors ?? [],
    texts: opts.texts ?? [],
    structures: opts.structures ?? [],
    suppressions: opts.suppressions ?? [],
    extractorHealth: healthMap,
    config,
    ...(opts.fileList !== undefined && { fileList: opts.fileList }),
    ...(opts.projectRoot !== undefined && { projectRoot: opts.projectRoot }),
  };
}

/**
 * Helper to create a StyleFact with minimal required fields.
 */
export function makeFact(
  overrides: Partial<StyleFact> & { property: string; value: string },
): StyleFact {
  return {
    rawValue: overrides.rawValue ?? overrides.value,
    source: "css",
    file: "test.css",
    line: 1,
    confidence: "high",
    ...overrides,
  };
}

/**
 * Helper to create a ColorFact with minimal required fields.
 */
export function makeColor(overrides: Partial<ColorFact> = {}): ColorFact {
  return {
    source: "css",
    file: "test.css",
    line: 1,
    confidence: "high",
    ...overrides,
  };
}

/**
 * Helper to create a TextFact with minimal boilerplate.
 */
export function makeTextFact(
  text: string,
  context: TextFact["context"],
  file: string = "page.tsx",
  line: number = 1,
): TextFact {
  return { text, context, file, line };
}

/**
 * Helper to create a StructuralFact with minimal boilerplate.
 */
export function makeStructuralFact(
  sectionType: StructuralFact["sectionType"],
  file: string = "page.tsx",
  line: number = 1,
): StructuralFact {
  return { sectionType, file, line };
}
