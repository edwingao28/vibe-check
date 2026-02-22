# Slop Detector Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Claude Code plugin that detects AI-generated "slop" in web projects by analyzing source code for telltale patterns of low-effort styling and content.

**Architecture:** Node.js/TypeScript scanner with a pipeline architecture (extractors → IR → signals → scoring → output). Distributed as a Claude Code plugin with a SKILL.md that instructs Claude to run the scanner and interpret results.

**Tech Stack:** TypeScript, PostCSS (CSS parsing), Babel (JSX parsing), Vitest (testing), YAML (config)

**Reference:** Full spec at `SPEC.md`. Read it before starting any task.

---

## Phase 1: Foundation

### Task 1: Project Scaffold + Types + IR + Config

**Goal:** Create the complete project scaffold with all shared TypeScript interfaces, the IR store, config loader, and build tooling. Every subsequent task depends on this.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/ir/types.ts` — StyleFact, ColorFact, StructuralFact, TextFact interfaces
- Create: `src/ir/store.ts` — IRStore class that collects facts from extractors
- Create: `src/extractors/types.ts` — ExtractorResult, ExtractorError, ExtractorStatus
- Create: `src/signals/types.ts` — SignalDefinition, SignalResult, SignalEvidence, SignalStatus
- Create: `src/scoring/types.ts` — CategoryDefinition, CategoryResult, ScoringResult, IntentResult, Band, Confidence
- Create: `src/output/types.ts` — Full ScanReport output schema interface (matches SPEC §12)
- Create: `src/config/types.ts` — SlopConfig interface (v1 minimal surface)
- Create: `src/config/defaults.ts` — Default thresholds, weights, excludes
- Create: `src/config/loader.ts` — .sloprc YAML parser with defaults merging
- Create: `src/scope/types.ts` — ScopeResult interface
- Create: `tests/config/loader.test.ts`
- Create: `tests/ir/store.test.ts`

**Step 1: Initialize the project**

```bash
cd /Users/wenyaogao/dev/osspj/aiagent/vibe-check
npm init -y
```

Update `package.json` to:

```json
{
  "name": "slop-detector",
  "version": "0.1.0",
  "description": "Detects AI-generated slop in web projects",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "slop-scan": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": ["slop", "ai", "design", "lint"],
  "license": "MIT"
}
```

**Step 2: Install dependencies**

```bash
npm install postcss postcss-scss postcss-sass yaml
npm install -D typescript vitest @types/node
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "fixtures"]
}
```

**Step 4: Create directory structure**

```bash
mkdir -p src/{ir,extractors,signals,scoring,output,config,scope}
mkdir -p tests/{ir,extractors,signals,scoring,output,config,scope}
mkdir -p fixtures
```

**Step 5: Write IR types** (`src/ir/types.ts`)

These are the core intermediate representation types that ALL extractors emit and ALL signals consume. Refer to SPEC §6.1 for the full contract.

```typescript
export type SourceType = "css" | "tailwind" | "inline" | "css-module";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface StyleFact {
  property: string;
  value: string;
  rawValue: string;
  source: SourceType;
  file: string;
  line: number;
  component?: string;
  confidence: ConfidenceLevel;
}

export interface ColorFact {
  hex?: string;
  hsl?: [number, number, number];
  token?: string;
  source: SourceType;
  file: string;
  line: number;
  confidence: ConfidenceLevel;
}

export interface TextFact {
  text: string;
  context: "heading" | "paragraph" | "button" | "link" | "other";
  file: string;
  line: number;
  component?: string;
}

export interface StructuralFact {
  sectionType: "hero" | "feature-grid" | "testimonial-section" | "pricing" |
    "cta-block" | "footer" | "stats" | "faq" | "contact" | "about" | "unknown";
  file: string;
  line: number;
  component?: string;
  children?: StructuralFact[];
}

export interface SuppressionFact {
  signals: string[];
  file: string;
  line: number;
}
```

**Step 6: Write extractor types** (`src/extractors/types.ts`)

```typescript
import { StyleFact, ColorFact, TextFact, StructuralFact, SuppressionFact } from "../ir/types.js";

export type ExtractorStatus = "healthy" | "degraded" | "failed";

export interface ExtractorError {
  file: string;
  message: string;
  line?: number;
}

export interface ExtractorResult {
  name: string;
  status: ExtractorStatus;
  filesAttempted: number;
  filesParsed: number;
  coverage: number;
  facts: StyleFact[];
  colors: ColorFact[];
  texts: TextFact[];
  structures: StructuralFact[];
  suppressions: SuppressionFact[];
  errors: ExtractorError[];
  note?: string;
}
```

**Step 7: Write signal types** (`src/signals/types.ts`)

Refer to SPEC §4.1 and §11 for signal dependency resolution.

```typescript
export type SignalStatus = "scored" | "insufficient_data";

export type CategoryId = "typography-color" | "spacing-effects" | "content" | "structure";

export interface SignalEvidence {
  summary: string;
  files: string[];
  detail?: string;
}

export interface SignalResult {
  id: string;
  name: string;
  category: CategoryId;
  score: number;
  rawScore: number;
  attenuatedScore: number;
  status: SignalStatus;
  confidence: "high" | "medium" | "low";
  evidence: SignalEvidence[];
}

export interface SignalDefinition {
  id: string;
  name: string;
  category: CategoryId;
  needs: string[];
  attenuatable: boolean;
  analyze: (ctx: SignalContext) => SignalResult;
}

export interface SignalContext {
  facts: import("../ir/types.js").StyleFact[];
  colors: import("../ir/types.js").ColorFact[];
  texts: import("../ir/types.js").TextFact[];
  structures: import("../ir/types.js").StructuralFact[];
  suppressions: import("../ir/types.js").SuppressionFact[];
  extractorHealth: Map<string, import("../extractors/types.js").ExtractorStatus>;
  config: import("../config/types.js").SlopConfig;
}
```

**Step 8: Write scoring types** (`src/scoring/types.ts`)

Refer to SPEC §4 and §5 for the full scoring model.

```typescript
import type { SignalResult, CategoryId } from "../signals/types.js";

export type Band = "Low" | "Moderate" | "High" | "Severe";
export type Confidence = "High" | "Medium" | "Low";
export type IntentTier = "None" | "Partial" | "Full";

export interface CategoryDefinition {
  id: CategoryId;
  name: string;
  signalIds: string[];
  weight: number;
}

export interface CategoryResult {
  id: CategoryId;
  name: string;
  score: number;
  signals: string[];
}

export interface IntentEvidence {
  type: string;
  count: number;
  description: string;
}

export interface IntentResult {
  score: number;
  tier: IntentTier;
  evidence: IntentEvidence[];
  attenuations: Record<string, number>;
}

export interface ScoringResult {
  slopScore: number;
  band: Band;
  confidence: Confidence;
  categories: CategoryResult[];
  intent: IntentResult;
  signals: SignalResult[];
}
```

**Step 9: Write output types** (`src/output/types.ts`)

This is the full JSON schema from SPEC §12.

```typescript
import type { Band, Confidence, IntentTier } from "../scoring/types.js";
import type { ExtractorStatus } from "../extractors/types.js";
import type { SignalStatus, CategoryId } from "../signals/types.js";

export interface ScanReport {
  schemaVersion: string;
  scannerVersion: string;
  scoringEpoch: string;
  scanMeta: {
    duration: number;
    timestamp: string;
    flags: string[];
    configFile: string | null;
  };
  scope: {
    method: "user-specified" | "smart-ui" | "full";
    resolvedPath: string;
    filesScanned: number;
    excludesApplied: string[];
  };
  coverage: {
    filesAttempted: number;
    filesParsed: number;
    overallCoverage: number;
    extractors: Array<{
      name: string;
      status: ExtractorStatus;
      filesAttempted: number;
      filesParsed: number;
      coverage: number;
      note?: string;
    }>;
  };
  overall: {
    slopScore: number;
    band: Band;
    confidence: Confidence;
  };
  intent: {
    score: number;
    tier: IntentTier;
    evidence: Array<{ type: string; count: number; description: string }>;
    attenuations: Record<string, number>;
  };
  categories: Array<{
    id: CategoryId;
    name: string;
    score: number;
    signals: string[];
  }>;
  signals: Array<{
    id: string;
    name: string;
    category: CategoryId;
    score: number;
    rawScore: number;
    attenuatedScore: number;
    status: SignalStatus;
    confidence: "high" | "medium" | "low";
    evidence: Array<{ summary: string; files: string[]; detail?: string }>;
  }>;
  suppressions: Array<{
    signal: string;
    file: string;
    line: number;
    type: "inline" | "config";
  }>;
  recommendations: {
    deepScanSuggested: boolean;
    reason: string;
  };
}
```

**Step 10: Write config types** (`src/config/types.ts`)

v1 minimal surface only (SPEC §9.2).

```typescript
export interface SlopConfig {
  scope: {
    exclude: string[];
  };
  signals: {
    disabled: string[];
    thresholds: Record<string, { warn: number; error: number }>;
    categoryWeights: Record<string, number>;
  };
  intent: {
    palette: {
      brandColors: string[];
    };
    tokens: {
      cssVarPrefixes: string[];
    };
  };
  suppressions: {
    allowInline: boolean;
  };
}
```

**Step 11: Write config defaults** (`src/config/defaults.ts`)

```typescript
import type { SlopConfig } from "./types.js";

export const DEFAULT_CONFIG: SlopConfig = {
  scope: {
    exclude: [],
  },
  signals: {
    disabled: [],
    thresholds: {
      "font-crime": { warn: 0.4, error: 0.7 },
      "purple-plague": { warn: 0.4, error: 0.7 },
      "whitespace-wasteland": { warn: 0.4, error: 0.7 },
      "shadow-realm": { warn: 0.4, error: 0.7 },
      "border-radius-maximum": { warn: 0.4, error: 0.7 },
      "gradient-overload": { warn: 0.4, error: 0.7 },
      "hero-syndrome": { warn: 0.4, error: 0.7 },
      "buzzword-bingo": { warn: 0.4, error: 0.7 },
      "cookie-cutter-layout": { warn: 0.4, error: 0.7 },
      "cta-mania": { warn: 0.4, error: 0.7 },
    },
    categoryWeights: {
      "typography-color": 1.0,
      "spacing-effects": 1.0,
      "content": 0.8,
      "structure": 0.8,
    },
  },
  intent: {
    palette: {
      brandColors: [],
    },
    tokens: {
      cssVarPrefixes: [],
    },
  },
  suppressions: {
    allowInline: true,
  },
};

export const DEFAULT_EXCLUDES: string[] = [
  "node_modules/**",
  ".next/**",
  "dist/**",
  "build/**",
  ".turbo/**",
  "coverage/**",
  ".git/**",
  "public/**",
  "__tests__/**",
  "**/*.test.*",
  "**/*.spec.*",
  "**/*.stories.*",
];

export const SCANNABLE_EXTENSIONS: string[] = [
  ".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".sass", ".mdx",
];

export const UI_DIRECTORIES: string[] = [
  "app", "pages", "components", "src/components",
  "src/app", "src/pages", "ui", "layouts",
];
```

**Step 12: Write config loader** (`src/config/loader.ts`)

```typescript
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { DEFAULT_CONFIG } from "./defaults.js";
import type { SlopConfig } from "./types.js";

export function loadConfig(projectRoot: string): { config: SlopConfig; configFile: string | null } {
  const configPath = join(projectRoot, ".sloprc");
  const configYamlPath = join(projectRoot, ".sloprc.yaml");
  const configYmlPath = join(projectRoot, ".sloprc.yml");

  const filePath = [configPath, configYamlPath, configYmlPath].find(p => existsSync(p));

  if (!filePath) {
    return { config: DEFAULT_CONFIG, configFile: null };
  }

  const raw = readFileSync(filePath, "utf-8");
  const parsed = parseYaml(raw) ?? {};

  const config: SlopConfig = {
    scope: {
      exclude: parsed?.scope?.exclude ?? DEFAULT_CONFIG.scope.exclude,
    },
    signals: {
      disabled: parsed?.signals?.disabled ?? DEFAULT_CONFIG.signals.disabled,
      thresholds: { ...DEFAULT_CONFIG.signals.thresholds, ...parsed?.signals?.thresholds },
      categoryWeights: { ...DEFAULT_CONFIG.signals.categoryWeights, ...parsed?.signals?.categoryWeights },
    },
    intent: {
      palette: {
        brandColors: parsed?.intent?.palette?.brandColors ?? DEFAULT_CONFIG.intent.palette.brandColors,
      },
      tokens: {
        cssVarPrefixes: parsed?.intent?.tokens?.cssVarPrefixes ?? DEFAULT_CONFIG.intent.tokens.cssVarPrefixes,
      },
    },
    suppressions: {
      allowInline: parsed?.suppressions?.allowInline ?? DEFAULT_CONFIG.suppressions.allowInline,
    },
  };

  return { config, configFile: filePath };
}
```

**Step 13: Write scope types** (`src/scope/types.ts`)

```typescript
export interface ScopeResult {
  method: "user-specified" | "smart-ui" | "full";
  resolvedPath: string;
  files: string[];
  excludesApplied: string[];
}
```

**Step 14: Write IR store** (`src/ir/store.ts`)

```typescript
import type { StyleFact, ColorFact, TextFact, StructuralFact, SuppressionFact } from "./types.js";
import type { ExtractorResult, ExtractorStatus } from "../extractors/types.js";

export class IRStore {
  facts: StyleFact[] = [];
  colors: ColorFact[] = [];
  texts: TextFact[] = [];
  structures: StructuralFact[] = [];
  suppressions: SuppressionFact[] = [];
  extractorHealth: Map<string, ExtractorStatus> = new Map();

  private extractorResults: ExtractorResult[] = [];

  addExtractorResult(result: ExtractorResult): void {
    this.extractorResults.push(result);
    this.facts.push(...result.facts);
    this.colors.push(...result.colors);
    this.texts.push(...result.texts);
    this.structures.push(...result.structures);
    this.suppressions.push(...result.suppressions);
    this.extractorHealth.set(result.name, result.status);
  }

  getExtractorResults(): ExtractorResult[] {
    return this.extractorResults;
  }

  getCoverage(): { filesAttempted: number; filesParsed: number; overallCoverage: number } {
    const filesAttempted = this.extractorResults.reduce((sum, r) => sum + r.filesAttempted, 0);
    const filesParsed = this.extractorResults.reduce((sum, r) => sum + r.filesParsed, 0);
    return {
      filesAttempted,
      filesParsed,
      overallCoverage: filesAttempted > 0 ? filesParsed / filesAttempted : 1,
    };
  }
}
```

**Step 15: Write failing tests**

`tests/config/loader.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../../src/config/loader.js";
import { DEFAULT_CONFIG } from "../../src/config/defaults.js";

const TEST_DIR = join(import.meta.dirname, "__tmp_config_test__");

beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

describe("loadConfig", () => {
  it("returns defaults when no config file exists", () => {
    const { config, configFile } = loadConfig(TEST_DIR);
    expect(configFile).toBeNull();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("merges .sloprc with defaults", () => {
    writeFileSync(join(TEST_DIR, ".sloprc"), `
signals:
  disabled:
    - gradient-overload
  thresholds:
    font-crime:
      warn: 0.5
      error: 0.9
`);
    const { config, configFile } = loadConfig(TEST_DIR);
    expect(configFile).toContain(".sloprc");
    expect(config.signals.disabled).toEqual(["gradient-overload"]);
    expect(config.signals.thresholds["font-crime"]).toEqual({ warn: 0.5, error: 0.9 });
    // Other thresholds should still have defaults
    expect(config.signals.thresholds["shadow-realm"]).toEqual(DEFAULT_CONFIG.signals.thresholds["shadow-realm"]);
  });

  it("reads .sloprc.yaml variant", () => {
    writeFileSync(join(TEST_DIR, ".sloprc.yaml"), `
suppressions:
  allowInline: false
`);
    const { config } = loadConfig(TEST_DIR);
    expect(config.suppressions.allowInline).toBe(false);
  });
});
```

`tests/ir/store.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { IRStore } from "../../src/ir/store.js";
import type { ExtractorResult } from "../../src/extractors/types.js";

describe("IRStore", () => {
  it("collects facts from multiple extractors", () => {
    const store = new IRStore();
    const result1: ExtractorResult = {
      name: "css",
      status: "healthy",
      filesAttempted: 10,
      filesParsed: 10,
      coverage: 1.0,
      facts: [{ property: "font-family", value: "Inter", rawValue: "Inter", source: "css", file: "a.css", line: 1, confidence: "high" }],
      colors: [],
      texts: [],
      structures: [],
      suppressions: [],
      errors: [],
    };
    const result2: ExtractorResult = {
      name: "tailwind",
      status: "degraded",
      filesAttempted: 5,
      filesParsed: 4,
      coverage: 0.8,
      facts: [{ property: "padding", value: "16px", rawValue: "p-4", source: "tailwind", file: "b.tsx", line: 5, confidence: "high" }],
      colors: [],
      texts: [],
      structures: [],
      suppressions: [],
      errors: [{ file: "c.tsx", message: "dynamic class" }],
    };

    store.addExtractorResult(result1);
    store.addExtractorResult(result2);

    expect(store.facts).toHaveLength(2);
    expect(store.extractorHealth.get("css")).toBe("healthy");
    expect(store.extractorHealth.get("tailwind")).toBe("degraded");

    const coverage = store.getCoverage();
    expect(coverage.filesAttempted).toBe(15);
    expect(coverage.filesParsed).toBe(14);
    expect(coverage.overallCoverage).toBeCloseTo(14 / 15);
  });

  it("handles empty state", () => {
    const store = new IRStore();
    expect(store.facts).toHaveLength(0);
    const coverage = store.getCoverage();
    expect(coverage.overallCoverage).toBe(1);
  });
});
```

**Step 16: Run tests to verify they pass**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 17: Build to verify types compile**

```bash
npm run build
```

Expected: Zero errors. All `.js` and `.d.ts` files generated in `dist/`.

**Step 18: Commit**

```bash
git init
git add package.json tsconfig.json src/ tests/
git commit -m "feat: project scaffold with types, IR store, and config loader"
```

**Acceptance Criteria:**
- `npm run build` exits 0 with no errors
- `npx vitest run` passes all tests
- All type files are importable: `import { StyleFact } from "./ir/types.js"` etc.
- Config loader reads .sloprc YAML and merges with defaults
- IR store collects facts from multiple extractors and reports coverage

---

## Phase 2: Parallel Modules

### Task 2: Extractors (CSS + Tailwind + Inline + CSS Module)

**Goal:** Implement all 4 style extractors. Each reads source files and emits StyleFact[], ColorFact[], TextFact[], StructuralFact[], and SuppressionFact[] into the IR. Each reports health via ExtractorResult.

**Reference:** SPEC §6.2, §6.3, §10 (inline suppressions)

**Files:**
- Create: `src/extractors/css.ts` — PostCSS-based CSS/SCSS parser
- Create: `src/extractors/tailwind.ts` — Tailwind class + config extractor
- Create: `src/extractors/inline.ts` — JSX inline style extractor (Babel)
- Create: `src/extractors/css-module.ts` — CSS Modules (delegates to CSS)
- Create: `src/extractors/utils/color-resolver.ts` — hex/rgb/hsl to HSL conversion + Tailwind palette map
- Create: `src/extractors/utils/tailwind-palette.ts` — Bundled Tailwind v3 default color palette
- Create: `src/extractors/utils/suppression-parser.ts` — Parse `slop-ignore` comments
- Create: `tests/extractors/css.test.ts`
- Create: `tests/extractors/tailwind.test.ts`
- Create: `tests/extractors/inline.test.ts`
- Create: `tests/extractors/css-module.test.ts`
- Create: `tests/extractors/utils/color-resolver.test.ts`
- Create: `tests/extractors/utils/suppression-parser.test.ts`
- Create: `tests/extractors/__fixtures__/` — small fixture CSS/TSX files for testing

**Key implementation notes:**

1. **CSS Extractor**: Use PostCSS to parse `.css`/`.scss`/`.sass` files. Walk all declarations. Extract `font-family`, spacing props (`margin`, `padding`, `gap`), `box-shadow`, `border-radius`, `background` (gradients), color props. Also extract CSS custom property declarations (`--*`). Detect `/* slop-ignore */` comments.

2. **Tailwind Extractor**: Scan `.tsx`/`.jsx`/`.ts`/`.js` files for `className=` attributes. Parse Tailwind class tokens (e.g., `p-4` → `padding: 16px`, `shadow-lg` → shadow fact, `rounded-lg` → border-radius fact, `text-purple-500` → color fact). Read `tailwind.config.js/ts` for custom theme entries. Track `@apply` directives in CSS files.

3. **Inline Style Extractor**: Use `@babel/parser` to parse JSX/TSX. Find `style={{...}}` expressions. Extract static key-value pairs (skip computed/dynamic values, tag as low confidence).

4. **CSS Module Extractor**: Delegates to the CSS extractor but tags all facts with `source: "css-module"` and attempts to detect the component using the `.module.css` filename convention.

5. **Color Resolver**: Convert hex → HSL, rgb → HSL, hsl pass-through. Bundled Tailwind default palette lookup (e.g., `purple-500` → `#a855f7` → HSL). Handle common CSS named colors.

6. **Suppression Parser**: Parse `/* slop-ignore: signal-1, signal-2 */` and `// slop-ignore: signal-1` and `{/* slop-ignore: signal-1 */}` patterns. Return SuppressionFact[].

**Testing approach:**
- Create small fixture files in `tests/extractors/__fixtures__/`:
  - `basic.css` — a few rules with fonts, shadows, colors, border-radius, a gradient
  - `with-vars.css` — CSS custom properties
  - `with-suppression.css` — slop-ignore comments
  - `tailwind-component.tsx` — JSX with Tailwind classes
  - `inline-styles.tsx` — JSX with style={{}} props
  - `module.module.css` — a CSS module file
- Unit test each extractor against its fixture; assert correct StyleFact[]/ColorFact[] output
- Test health reporting: feed a deliberately malformed file, assert status is "degraded"

**Acceptance Criteria:**
- `npx vitest run tests/extractors` passes all tests
- CSS extractor correctly extracts font-family, spacing, shadow, border-radius, gradient, and color facts from `basic.css`
- Tailwind extractor resolves `p-4` to `padding: 16px` (StyleFact), `text-purple-500` to a ColorFact with HSL
- Inline extractor parses `style={{ padding: '16px' }}` into a StyleFact
- Suppression parser detects `slop-ignore` in CSS, JSX, and JS comment styles
- Each extractor reports proper health status and coverage metrics

---

### Task 3: Tier 1 Signals (6 Deterministic)

**Goal:** Implement the 6 Tier 1 signal analyzers + the signal registry. Each signal takes an IR context and produces a SignalResult with a 0-1 score, evidence, and status.

**Reference:** SPEC §2 (Tier 1 table), §3.1, §3.3, §4.1, §11

**Files:**
- Create: `src/signals/font-crime.ts`
- Create: `src/signals/purple-plague.ts`
- Create: `src/signals/whitespace-wasteland.ts`
- Create: `src/signals/shadow-realm.ts`
- Create: `src/signals/border-radius-maximum.ts`
- Create: `src/signals/gradient-overload.ts`
- Create: `src/signals/registry.ts` — runs all enabled signals
- Create: `src/signals/utils/math.ts` — Shannon entropy, unique ratio helpers
- Create: `tests/signals/font-crime.test.ts`
- Create: `tests/signals/purple-plague.test.ts`
- Create: `tests/signals/whitespace-wasteland.test.ts`
- Create: `tests/signals/shadow-realm.test.ts`
- Create: `tests/signals/border-radius-maximum.test.ts`
- Create: `tests/signals/gradient-overload.test.ts`
- Create: `tests/signals/registry.test.ts`
- Create: `tests/signals/__helpers__/make-context.ts` — factory to create SignalContext from crafted facts

**Key implementation notes per signal:**

1. **Font Crime** (`needs: ["css", "tailwind"]`): Filter facts where `property === "font-family"`. Count distinct values. Score: `1 - (min(distinctFonts, 4) / 4)`. One font = 0.75, zero (only Tailwind defaults) = 1.0, 4+ fonts = 0.0. Evidence: list the fonts found and their file locations.

2. **Purple Plague** (`needs: ["css", "tailwind", "inline"]`): Filter ColorFacts. For resolved colors (confidence !== "low"), convert to HSL. Count colors in purple hue range (260-310°) vs total chromatic colors (ignore grays: saturation < 10%). Score factors: (a) purple ratio, (b) hue variance (low variance = all same shade = less bad), (c) tokenization ratio (colors from CSS vars = higher intent). Combined: `purpleRatio * 0.6 + (1 - tokenRatio) * 0.2 + lowVariance * 0.2`. Only trigger when purple ratio > 0.3 AND at least 5 chromatic colors exist.

3. **Whitespace Wasteland** (`needs: ["css", "tailwind"]`): Filter facts where property is a spacing property (`margin*`, `padding*`, `gap`). Extract numeric px values. Compute Shannon entropy of the value distribution. Compute unique ratio = uniqueValues / totalDeclarations. Score: `1 - (normalizedEntropy * 0.6 + uniqueRatio * 0.4)`. Low entropy + low unique ratio = high score (monotonous).

4. **Shadow Realm** (`needs: ["css", "tailwind"]`): Filter facts where `property === "box-shadow"`. Count components with shadows vs total components (derive components from unique `file` or `component` values in all facts). Score: `shadowComponentRatio` clamped to [0, 1]. Evidence: "shadows on X% of components (N/M)".

5. **Border Radius Maximum** (`needs: ["css", "tailwind"]`): Filter facts where `property === "border-radius"`. Count value frequencies. Find the most common value. Score: `mostCommonRatio - 0.3` clamped to [0, 1] (if one value is >70% of all radius declarations, score is high). Evidence: "X% of border-radius declarations use 'rounded-lg'".

6. **Gradient Overload** (`needs: ["css", "tailwind"]`): Filter facts where value contains `gradient` or property indicates a gradient. Count gradients per unique file (proxy for per-page). Score: `min(1, avgGradientsPerFile / 3)`. Evidence: "N gradient declarations across M files".

**Signal Registry** (`src/signals/registry.ts`):
- Imports all signal definitions
- `runSignals(ctx: SignalContext): SignalResult[]` — iterates registered signals, checks if signal is disabled in config, checks extractor dependency health, runs each signal, returns results.

**Test helper** (`tests/signals/__helpers__/make-context.ts`):
- Factory function that creates a `SignalContext` with configurable facts, colors, texts, structures. Defaults to healthy extractors and default config.

**Testing approach:**
- Each signal test creates a crafted context via the helper
- Test with "known sloppy" input → expect score in [0.6, 1.0]
- Test with "known clean" input → expect score in [0.0, 0.3]
- Test with empty input → expect score of 0 or insufficient_data
- Test with degraded dependency → expect insufficient_data status
- Registry test: verify disabled signals are skipped, healthy signals produce results

**Acceptance Criteria:**
- `npx vitest run tests/signals` passes all tests
- Each signal produces scores within expected bands for crafted inputs
- Signals with failed dependencies output `status: "insufficient_data"`
- Registry respects `config.signals.disabled`

---

### Task 4: Tier 2 Signals (4 Heuristic)

**Goal:** Implement the 4 Tier 2 signal analyzers. These use heuristics for the fast pass (no LLM). Buzzword Bingo includes the tiered lexicon and n-gram phrase list.

**Reference:** SPEC §2 (Tier 2 table), §3.2, §3.4

**Files:**
- Create: `src/signals/hero-syndrome.ts`
- Create: `src/signals/buzzword-bingo.ts`
- Create: `src/signals/cookie-cutter-layout.ts`
- Create: `src/signals/cta-mania.ts`
- Create: `src/signals/data/buzzwords.ts` — tiered word list + n-gram phrases
- Create: `tests/signals/hero-syndrome.test.ts`
- Create: `tests/signals/buzzword-bingo.test.ts`
- Create: `tests/signals/cookie-cutter-layout.test.ts`
- Create: `tests/signals/cta-mania.test.ts`
- Modify: `src/signals/registry.ts` — add Tier 2 signals to registry

**Key implementation notes:**

1. **Hero Syndrome** (`needs: ["tailwind", "inline"]`): Examine StructuralFact[] for hero-type sections (sectionType === "hero" or first section in file). Check if the structure follows the template: one heading TextFact + one paragraph TextFact + one button TextFact within the section's file context. Score: 1.0 if exact match, 0.5 if partial (heading + button but no paragraph), 0.0 if no hero detected. If no StructuralFacts available, fall back to TextFact analysis: look for a single h1 + single p + single button pattern in the first 50 lines of each page file.

2. **Buzzword Bingo** (`needs: ["css", "tailwind", "inline"]`): Import the tiered lexicon from `data/buzzwords.ts`. For each page file's TextFact[], compute: (a) weighted density = sum(tier_weight × match_count) / (totalWords / 100), (b) variety = count of distinct buzzwords, (c) co-occurrence = number of distinct tiers present on same page. Score formula: `min(1, (density * 0.5 + variety/20 * 0.3 + coOccurrence/3 * 0.2))`. Only flag when density > 2 AND variety > 3.

3. **Cookie Cutter Layout** (`needs: ["tailwind", "inline"]`): Collect StructuralFact[] grouped by file. For each page file, generate a fingerprint (ordered list of sectionType strings). Compare all page fingerprints using Jaccard similarity. Score: average pairwise similarity across all page pairs, minus a baseline of 0.3 (some similarity is expected). Clamp to [0, 1]. If fewer than 2 pages detected, score 0.

4. **CTA Mania** (`needs: ["tailwind", "inline"]`): Count TextFact[] where `context === "button"` or `context === "link"`, grouped by file. Score: for the worst page, `min(1, (ctaCount - 3) / 5)`. Only count "prominent" CTAs (skip nav links by checking for common nav patterns). Evidence: "N CTA elements on page X".

**Buzzword Data** (`src/signals/data/buzzwords.ts`):

```typescript
export const BUZZWORDS = {
  tierA: { weight: 3, words: ["synergy", "revolutionize", "game-changing", "next-generation", "paradigm shift", "disruptive", "best-in-class", "world-class", "turn-key", "bleeding-edge"] },
  tierB: { weight: 1, words: ["leverage", "empower", "streamline", "cutting-edge", "solutions", "optimize", "transform", "elevate", "unlock", "supercharge"] },
  tierC: { weight: 0.5, words: ["innovative", "seamless", "robust", "scalable", "dynamic", "powerful", "intuitive", "comprehensive", "flexible", "efficient"] },
};

export const PHRASE_PATTERNS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /in today'?s (?:fast-paced|digital|modern|ever-changing) world/i, weight: 5 },
  { pattern: /whether you'?re a .+ or (?:a )?.+/i, weight: 4 },
  { pattern: /take your .+ to the next level/i, weight: 5 },
  { pattern: /designed with you in mind/i, weight: 5 },
  { pattern: /built for the modern .+/i, weight: 4 },
  { pattern: /everything you need to .+/i, weight: 3 },
  { pattern: /ready to (?:get started|transform|revolutionize|elevate)/i, weight: 4 },
  { pattern: /join (?:thousands|millions|hundreds) of .+ who/i, weight: 4 },
  { pattern: /it'?s (?:time to|never been easier)/i, weight: 3 },
  { pattern: /from .+ to .+,? we'?ve got you covered/i, weight: 5 },
];
```

**Testing approach:**
- Hero Syndrome: craft TextFact[] with h1+p+button pattern → expect high score. Craft diverse content → expect low score.
- Buzzword Bingo: craft TextFact[] full of tier A buzzwords → expect high score. Normal text → expect low score.
- Cookie Cutter: create StructuralFact[] with identical fingerprints across 3 pages → expect high score. Varied pages → expect low.
- CTA Mania: craft 6 button TextFacts on one page → expect high score. 2 buttons → expect low.

**Acceptance Criteria:**
- `npx vitest run tests/signals` passes (including Tier 1 from T3)
- Buzzword lexicon contains all 3 tiers + phrase patterns from SPEC §3.2
- Each Tier 2 signal scores crafted inputs within expected bands
- Registry runs all 10 signals when none are disabled

---

### Task 5: Scoring Engine

**Goal:** Implement the scoring engine: power mean category aggregation, intent score calculation, attenuation, band mapping, and confidence derivation.

**Reference:** SPEC §4, §5

**Files:**
- Create: `src/scoring/aggregator.ts` — power mean category aggregation + overall score
- Create: `src/scoring/intent.ts` — intent score from IR evidence
- Create: `src/scoring/attenuation.ts` — apply intent-based attenuation to signal scores
- Create: `src/scoring/bands.ts` — score → band, coverage → confidence
- Create: `src/scoring/categories.ts` — category definitions (the 4 categories)
- Create: `tests/scoring/aggregator.test.ts`
- Create: `tests/scoring/intent.test.ts`
- Create: `tests/scoring/attenuation.test.ts`
- Create: `tests/scoring/bands.test.ts`

**Key implementation notes:**

1. **Category definitions** (`src/scoring/categories.ts`):
   ```typescript
   export const CATEGORIES: CategoryDefinition[] = [
     { id: "typography-color", name: "Typography & Color", signalIds: ["font-crime", "purple-plague"], weight: 1.0 },
     { id: "spacing-effects", name: "Spacing & Effects", signalIds: ["whitespace-wasteland", "shadow-realm", "border-radius-maximum", "gradient-overload"], weight: 1.0 },
     { id: "content", name: "Content", signalIds: ["buzzword-bingo", "hero-syndrome"], weight: 0.8 },
     { id: "structure", name: "Structure", signalIds: ["cookie-cutter-layout", "cta-mania"], weight: 0.8 },
   ];
   ```

2. **Power mean aggregation** (`src/scoring/aggregator.ts`):
   - For each category: collect signal results that belong to it. Use attenuated scores.
   - Power mean with p=2: `C_k = sqrt(sum(w_i * s_i^2) / sum(w_i))`
   - Skip signals with `status: "insufficient_data"`.
   - Apply coverage correction: if >50% of signals in a category are insufficient, mark category score as `NaN` and exclude from overall.
   - Overall: `slopScore = 100 * sum(W_k * C_k) / sum(W_k)` where only categories with valid scores contribute.
   - Clamp to [0, 100].

3. **Intent score** (`src/scoring/intent.ts`):
   - Input: IRStore (to count CSS vars, detect token files) + extracted Tailwind config info
   - Counting logic per SPEC §5.1 table:
     - Custom Tailwind theme entries: 3 per entry, capped at 30
     - CSS custom properties: 2 per var, capped at 30
     - Design token files: 15 per file
     - Naming conventions: 10 if consistent `--prefix-*` patterns detected
     - Font imports: 5 per non-default font
     - Style guide: 5 if detected
   - Tier: 0-20 = None, 21-55 = Partial, 56-100 = Full
   - Cap total at 100.

4. **Attenuation** (`src/scoring/attenuation.ts`):
   - Input: IntentTier + SignalResult[]
   - Per SPEC §5.3 table, multiply `rawScore` by attenuation factor for applicable signals.
   - Non-attenuatable signals: attenuatedScore = rawScore.
   - Return modified SignalResult[] with updated `attenuatedScore` field.

5. **Band mapping** (`src/scoring/bands.ts`):
   - 0-25 → "Low", 26-50 → "Moderate", 51-75 → "High", 76-100 → "Severe"
   - Coverage → Confidence: >0.9 healthy → "High", 0.7-0.9 → "Medium", <0.7 → "Low"

**Testing approach:**
- Aggregator: create mock SignalResult[] with known scores. Verify category power mean math. Verify overall score.
- Intent: create mock IR with known CSS vars and theme entries. Verify score and tier.
- Attenuation: verify that Font Crime rawScore 0.8 with "Partial" intent → attenuatedScore 0.56 (0.8 × 0.7).
- Bands: verify boundary values (25 → Low, 26 → Moderate, etc.).

**Acceptance Criteria:**
- `npx vitest run tests/scoring` passes all tests
- Power mean formula matches SPEC §4.2 exactly
- Intent tiers match SPEC §5.2 boundaries
- Attenuation multipliers match SPEC §5.3 table
- Band boundaries match SPEC §4.3

---

### Task 6: Scope + Output + CLI

**Goal:** Implement the scope resolver, JSON reporter, and CLI entry point that wires the full pipeline together.

**Reference:** SPEC §7, §12, §14, §15

**Files:**
- Create: `src/scope/resolver.ts` — smart scope detection + file listing
- Create: `src/scope/excludes.ts` — exclude pattern matching
- Create: `src/output/json-reporter.ts` — produces ScanReport JSON
- Create: `src/index.ts` — CLI entry point with arg parsing
- Create: `tests/scope/resolver.test.ts`
- Create: `tests/output/json-reporter.test.ts`

**Key implementation notes:**

1. **Scope Resolver** (`src/scope/resolver.ts`):
   - Parse CLI args: if path provided, use it (method: "user-specified"). If `--full`, scan project root (method: "full"). Otherwise smart-ui detection.
   - Smart-ui: if `src/` exists, scan `src/`. Else scan project root limited to UI_DIRECTORIES.
   - Collect files matching SCANNABLE_EXTENSIONS using recursive directory walk.
   - Apply DEFAULT_EXCLUDES + config excludes via glob matching (use `minimatch` or simple pattern matching).
   - Return ScopeResult with method, resolvedPath, files[], excludesApplied[].

2. **Exclude matching** (`src/scope/excludes.ts`):
   - Use `minimatch` for glob pattern matching against file paths.
   - Export `isExcluded(filePath: string, patterns: string[]): boolean`.

3. **JSON Reporter** (`src/output/json-reporter.ts`):
   - Takes: ScoringResult, IRStore, ScopeResult, config metadata, duration, flags.
   - Produces: ScanReport matching the schema in SPEC §12.
   - Include recommendations logic: if slopScore > 50 and any Tier 2 signals scored, suggest deep scan.

4. **CLI Entry Point** (`src/index.ts`):
   ```
   #!/usr/bin/env node
   ```
   - Parse args: `slop-scan [path] [--verbose] [--json] [--deep] [--full] [--no-cache]`
   - Simple arg parser (no dependency needed, or use `parseArgs` from `node:util`).
   - Pipeline: resolve scope → run extractors → build IR → run signals → compute intent → attenuate → aggregate → report.
   - For v1: `--deep` and `--no-cache` are accepted but no-ops (print message).
   - `--json` outputs raw JSON to stdout.
   - Default (no --json): outputs JSON to stdout (SKILL.md handles formatting).
   - `--verbose` adds a `verbose: true` field to the JSON output.
   - Exit code 0 always (exit codes are v2).

**Install minimatch:**
```bash
npm install minimatch
npm install -D @types/minimatch
```

**Testing approach:**
- Scope resolver: create a temp directory structure mimicking a Next.js project. Assert correct file list.
- JSON reporter: feed mock ScoringResult + IRStore. Assert output matches ScanReport shape.
- CLI: tested via integration tests in T8 (end-to-end).

**Acceptance Criteria:**
- `npx vitest run tests/scope tests/output` passes
- `npm run build` succeeds
- `node dist/index.js --help` prints usage (or at minimum doesn't crash)
- Scope resolver correctly identifies `src/` as scan root in a project with `src/app/`
- JSON output includes all required top-level fields from SPEC §12

---

## Phase 3: Integration

### Task 7: SKILL.md + Plugin Manifest

**Goal:** Create the SKILL.md (the Claude Code slash command that interprets scanner output), plugin.json manifest, and default config file.

**Reference:** SPEC §1, §8, §13.4

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `skills/slop-check/SKILL.md`
- Create: `.sloprc.defaults.yaml`

**Key implementation notes:**

1. **plugin.json**:
   ```json
   {
     "name": "slop-detector",
     "version": "0.1.0",
     "description": "Detects AI-generated slop in web projects",
     "author": "your-name",
     "skills": ["skills/slop-check"],
     "scripts": {
       "scanner": "src/index.ts"
     }
   }
   ```

2. **SKILL.md** structure (per SPEC §13.4):
   - **Trigger**: `/slop-check [path] [flags]`
   - **Instructions section**: Tell Claude to run `npx slop-scan [path] [flags] --json` via Bash
   - **Parsing section**: Read the JSON output, extract key fields
   - **Decision tree**: Conditional formatting rules
     - If score > 75: lead with urgency
     - If intent tier is "Full": acknowledge design system
     - If 1-2 signals fire: frame as suggestions
     - If confidence is "Low": caveat the score
     - If deepScanSuggested: include recommendation
   - **Output template**: The exact format from SPEC §13.1 (score, category bars, top issues)
   - **Few-shot examples**: 3-4 example JSON inputs and their expected formatted outputs
     - High slop example (score ~80)
     - Medium slop example (score ~45)
     - Low slop example (score ~15)
     - Design system example (high intent, moderate slop)
   - **Deep scan section**: If `--deep` flag was passed, additional instructions for Claude to re-examine Tier 2 signals using the evidence in the JSON

3. **.sloprc.defaults.yaml**: Full annotated default config (matches SPEC §9.1 but with comments explaining each field).

**Acceptance Criteria:**
- SKILL.md is valid Markdown with clear sections
- SKILL.md includes: trigger, scanner execution command, JSON parsing instructions, decision tree, output template, at least 3 few-shot examples, deep scan instructions
- plugin.json is valid JSON with name, version, description
- .sloprc.defaults.yaml is valid YAML with all v1 config fields annotated

---

### Task 8: Integration Tests + Fixture Projects

**Goal:** Create fixture projects and integration tests that run the full scanner end-to-end. Use golden score band assertions.

**Reference:** SPEC §16

**Files:**
- Create: `fixtures/slop-heavy/` — AI-generated landing page
- Create: `fixtures/clean/` — Well-designed site with custom theme
- Create: `fixtures/tailwind-only/` — Tailwind defaults, minimal customization
- Create: `fixtures/minimal/` — Single page, minimal styles
- Create: `fixtures/design-system/` — Full token system
- Create: `tests/integration/full-pipeline.test.ts`
- Create: `tests/integration/golden-bands.ts` — expected score ranges per fixture

**Fixture specifications:**

1. **slop-heavy/** — Should score 60-90 overall:
   - `app/page.tsx`: Hero with "Revolutionize your workflow" + generic paragraph + CTA
   - `app/layout.tsx`: Single font (Inter), purple color scheme
   - `components/Card.tsx`: shadow-lg, rounded-lg, gradient background
   - `components/Features.tsx`: 3-card grid with shadows and identical spacing (p-8)
   - `components/CTA.tsx`: 5 CTA buttons
   - `globals.css`: minimal custom CSS, all purple shades
   - `tailwind.config.js`: no custom theme

2. **clean/** — Should score 0-25 overall:
   - `app/page.tsx`: Specific content, varied layout
   - `app/layout.tsx`: 2 fonts (Inter + Playfair Display), custom color palette
   - `components/Card.tsx`: varied radii, minimal shadows
   - `globals.css`: CSS custom properties (--color-*, --space-*)
   - `tailwind.config.js`: custom theme with brand colors, spacing scale
   - `tokens.css`: design tokens file

3. **tailwind-only/** — Should score 30-55 overall:
   - `app/page.tsx`: Tailwind classes, some variety but default palette
   - `components/Hero.tsx`: Template-ish hero but with specific content
   - `tailwind.config.js`: minimal config, no custom theme

4. **minimal/** — Should score 0-20 (too little to judge):
   - `index.tsx`: Single page with a few elements
   - `styles.css`: 3 rules
   - Expected: Low confidence due to minimal data

5. **design-system/** — Should have intent score 56-100:
   - `tokens/colors.ts`: Design token definitions
   - `tokens/spacing.ts`: Spacing scale tokens
   - `tailwind.config.ts`: Extensive custom theme (20+ overrides)
   - `globals.css`: 30+ CSS custom properties
   - `STYLE_GUIDE.md`: Empty style guide (existence is enough)
   - `components/Button.tsx`: Consistent use of tokens

**Golden bands** (`tests/integration/golden-bands.ts`):

```typescript
export const GOLDEN_BANDS = {
  "slop-heavy": {
    overall: { min: 60, max: 90 },
    intent: { tier: "None" as const },
    signals: {
      "font-crime": { min: 0.6, max: 1.0 },
      "shadow-realm": { min: 0.5, max: 1.0 },
      "buzzword-bingo": { min: 0.4, max: 1.0 },
    },
  },
  "clean": {
    overall: { min: 0, max: 25 },
    intent: { tier: "Full" as const },
  },
  "tailwind-only": {
    overall: { min: 30, max: 55 },
    intent: { tier: "None" as const },
  },
  "minimal": {
    overall: { min: 0, max: 20 },
  },
  "design-system": {
    intent: { tier: "Full" as const, minScore: 56 },
  },
};
```

**Integration test** (`tests/integration/full-pipeline.test.ts`):
- For each fixture: run the full pipeline programmatically (import index.ts internals, don't shell out)
- Assert overall score within golden bands
- Assert intent tier matches expectations
- Assert specific signal scores where specified
- Assert no extractor failures (all fixtures are clean parseable code)

**Acceptance Criteria:**
- `npx vitest run tests/integration` passes all tests
- All fixtures produce scores within their golden bands
- No extractor reports "failed" status on any fixture
- `design-system` fixture has intent tier "Full"
- `slop-heavy` fixture has at least 5 signals scoring above 0.4
- Full pipeline completes in under 10 seconds per fixture

---

## Execution Order

```
Phase 1 (sequential):
  T1: Scaffold + Types + IR + Config        → commit

Phase 2 (parallel, all depend on T1 output):
  T2: Extractors                            → commit
  T3: Tier 1 Signals                        → commit
  T4: Tier 2 Signals                        → commit
  T5: Scoring Engine                        → commit
  T6: Scope + Output + CLI                  → commit

Phase 3 (sequential, depends on T2-T6):
  T7: SKILL.md + Plugin Manifest            → commit
  T8: Integration Tests + Fixtures          → commit
```

Each task is designed to be completable by a standalone agent with:
1. Access to the SPEC.md
2. Access to T1's output (types and scaffold)
3. Its specific task description from this plan
4. Ability to run `npm run build` and `npx vitest run` for validation
