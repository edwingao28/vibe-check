# Slop Detector — Technical Specification v1

A Claude Code plugin that detects AI-generated "slop" in web projects by analyzing
source code for telltale patterns of low-effort, template-driven styling and content.

---

## 1. Architecture Overview

### Plugin Structure

```
slop-detector/
  .claude-plugin/
    plugin.json                 # Manifest (name, version, author)
  skills/
    slop-check/
      SKILL.md                  # The /slop-check slash command
  src/                          # Node.js/TypeScript scanner
    extractors/                 # Style extraction from different sources
    ir/                         # Intermediate representation
    signals/                    # One file per signal analyzer
    scoring/                    # Aggregation and scoring engine
    output/                     # JSON reporter
    index.ts                    # CLI entry point
  fixtures/                     # Test fixture projects
  .sloprc.defaults.yaml         # Default configuration
  package.json
  tsconfig.json
```

### Execution Flow

```
User runs /slop-check [path] [flags]
  → SKILL.md instructs Claude to:
      1. Run `npx slop-scan [path] [flags]` via Bash (outputs JSON)
      2. Read the JSON report
      3. Interpret results using structured template + decision tree
      4. Output formatted report to user
  → If --deep flag: Claude also performs LLM-assisted Tier 2 analysis
```

### Key Decision: Node.js, Not Python

The scanner is written in Node.js/TypeScript because:
- Target projects are JS/TS (Next.js, React, Tailwind) — users always have Node
- First-class parsing libraries: PostCSS (CSS), Babel (JSX), Tailwind config resolution
- No Python version conflicts or venv management
- Can publish as npm package for familiar installation

### Distribution (v1)

```bash
# Clone and add locally
git clone https://github.com/you/slop-detector
/plugin add ./slop-detector

# Or via marketplace (when available)
/plugin marketplace add yourname/slop-detector
/plugin install slop-detector
```

---

## 2. Signals

### v1 ships all 10 signals across two tiers.

### Tier 1 — Deterministic (fast pass, always runs)

| # | Signal | Category | What We Scan | Detection Logic |
|---|--------|----------|-------------|----------------|
| 1 | **Font Crime** | Typography & Color | CSS files, Tailwind config, font imports, Google Fonts links | Count distinct `font-family` declarations. Score inversely proportional to font variety. Single-font sites score high. |
| 2 | **Purple Plague** | Typography & Color | Color values in CSS/Tailwind/inline styles | Hybrid color resolution (see §3.3). Score based on: hue dominance in purple range (260-310°) + high variance + low tokenization. Dominance alone is not sufficient to trigger. |
| 3 | **Whitespace Wasteland** | Spacing & Effects | Tailwind spacing classes, CSS margin/padding values | Entropy-based analysis (see §3.1). Shannon entropy of spacing value distribution + ratio of unique values to total declarations. Low entropy + low ratio = monotonous spacing. Context-aware grouping is a v2 enhancement. |
| 4 | **Shadow Realm** | Spacing & Effects | CSS `box-shadow`, Tailwind `shadow-*` classes | Count shadow declarations relative to component count. Score based on shadow density across the project. |
| 5 | **Border Radius Maximum** | Spacing & Effects | CSS `border-radius`, Tailwind `rounded-*` classes | Measure radius value variety. Score based on concentration: if >70% of declarations use a single radius value, score high. |
| 6 | **Gradient Overload** | Spacing & Effects | CSS `linear-gradient`/`radial-gradient`, Tailwind `bg-gradient-*` | Count gradient declarations relative to page/component count. Score based on gradient density. |

### Tier 2 — Heuristic-first, LLM deep scan opt-in

| # | Signal | Category | What We Scan | Heuristic Detection | Deep Scan Enhancement |
|---|--------|----------|-------------|--------------------|-----------------------|
| 7 | **Hero Syndrome** | Content | First `<section>` or hero-named component | Pattern match: single h1 + single paragraph + single CTA button template | LLM evaluates whether the hero content is generic/templated vs. specific |
| 8 | **Buzzword Bingo** | Content | Text content in components/pages | Tiered wordlist + n-gram phrase matching + density/co-occurrence scoring (see §3.2) | LLM evaluates whether flagged language is appropriate for the domain |
| 9 | **Cookie Cutter Layout** | Structure | Page/route components | Section type fingerprinting: classify each top-level section (hero, feature-grid, testimonial, pricing, CTA, footer), create fingerprint per page, score similarity across pages | LLM evaluates whether structural similarity is intentional (design system) vs. lazy |
| 10 | **CTA Mania** | Structure | Button/link elements | Count CTA-style buttons per page. Score based on CTA density. Flag when >3 prominent CTAs on a single page. | LLM evaluates CTA relevance and whether density is justified by page purpose |

### Tier 3 — Deferred (v2+)

| Signal | Why Deferred |
|--------|-------------|
| Stock Photo Syndrome | Needs image content analysis, not just code |
| Testimonial Factory | Needs to understand if testimonials are real vs. generated |
| Emoji Infestation | Simple count, but very context-dependent |
| Card Carnival | Overlaps with Cookie Cutter; hard to define threshold |

---

## 3. Signal Detection Details

### 3.1 Spacing Analysis (Whitespace Wasteland)

The naive approach of flagging "even multiples" penalizes every Tailwind project (whose
default scale IS 4px increments). The real signal is lack of variation.

**Primary metrics:**
- **Shannon entropy** of spacing value distribution. Low entropy = repetitive.
  A site using only `p-4` and `m-8` everywhere has low entropy.
  A site using `p-2`, `p-4`, `p-6`, `p-8`, `p-12` has higher entropy.
- **Unique ratio**: unique spacing values / total spacing declarations, normalized
  by component count. Using 200 declarations but only 3 unique values = monotonous.

**Scoring**: Combine entropy and unique ratio (weighted). Threshold on the combined
metric, not on whether values are "even multiples."

**v2 enhancement**: Context-aware grouping — group spacing by UI context (headers,
cards, sections, lists). Flag when semantically different components use identical
spacing. Two cards matching is fine; a card and a hero section matching is sloppy.

### 3.2 Buzzword Detection (Buzzword Bingo)

**Tiered wordlist:**
- **Tier A** (weight 3, almost always slop): "synergy", "revolutionize", "game-changing",
  "next-generation", "paradigm shift"
- **Tier B** (weight 1, context-dependent): "leverage", "empower", "streamline",
  "cutting-edge", "solutions"
- **Tier C** (weight 0.5, only slop in clusters): "innovative", "seamless", "robust",
  "scalable", "dynamic"

**N-gram phrase patterns** (weight 4-6):
- "In today's fast-paced world"
- "Whether you're a X or Y"
- "Take your X to the next level"
- "Designed with you in mind"
- "Built for the modern X"

**Scoring formula:**
- Weighted density = sum(weight × count) / (total words / 100)
- Variety = count of distinct buzzwords found
- Co-occurrence penalty = multiplier when multiple tiers present on same page

Only flag when density is high AND variety/co-occurrence is high. A single "leverage"
does not move the needle.

**Output evidence**: Top matched terms/phrases + counts + source lines/snippets (capped).

**Customization via .sloprc**: Users can add/remove buzzwords, allowlist domain-specific
terms (so "AI" doesn't always trigger in an AI company's site).

### 3.3 Color Pipeline (Purple Plague)

**Resolution pipeline:**
1. Extract all color references with provenance (CSS literal, Tailwind class, CSS var,
   inline style)
2. Resolve reliable sources to RGB/HSL:
   - CSS hex/rgb/hsl literals → direct conversion
   - Tailwind default palette classes → bundled color map lookup
   - Custom Tailwind theme → read `tailwind.config.js` and resolve
3. For CSS custom properties: attempt limited resolution (root vars + short chains).
   Tag with confidence (high/med/low)
4. Keep unresolvable tokens as token IDs with frequency counts

**Analysis (dual reporting):**
- **Resolved metrics**: Hue distribution (ignore low-saturation grays), variance,
  dominant hue detection. Purple Plague triggers on purple dominance + high variance
  + low tokenization (not dominance alone).
- **Token frequency**: Unresolved token/class counts for coverage reporting.

### 3.4 Layout Fingerprinting (Cookie Cutter Layout)

For each page/route file:
1. Identify top-level sections
2. Classify each as a section type: `hero`, `feature-grid`, `testimonial-section`,
   `pricing`, `cta-block`, `footer`, `stats`, `faq`, `contact`, `about`
3. Generate a fingerprint (ordered list of section types) per page
4. Score similarity across all pages. High similarity = cookie cutter.

Classification uses heuristics: component names, CSS class names, content patterns
(h1+p+button = hero, 3-column grid = feature-grid, etc.).

---

## 4. Scoring Model

### 4.1 Signal Scores

Each signal produces a **continuous score sᵢ ∈ [0, 1]**, monotonic (higher = sloppier).
Each score carries:
- `confidence`: derived from extractor coverage
- `status`: `scored` | `insufficient_data` (when dependency extractors are degraded)

### 4.2 Category Aggregation

**Four categories:**

| Category | Signals | Description |
|----------|---------|-------------|
| Typography & Color | Font Crime, Purple Plague | Font variety and color palette analysis |
| Spacing & Effects | Whitespace Wasteland, Shadow Realm, Border Radius Maximum, Gradient Overload | Visual effect density and spacing monotony |
| Content | Buzzword Bingo, Hero Syndrome | Text quality and content template detection |
| Structure | Cookie Cutter Layout, CTA Mania | Page structure variety and CTA density |

**Aggregation method**: Power mean with p=2 (emphasizes strong signals, prevents
dilution by many weak ones):

```
C_k = ( Σ(wᵢ · sᵢ²) / Σ(wᵢ) )^(1/2)
```

Where `wᵢ` are per-signal weights within the category (configurable in .sloprc,
conservative defaults shipped).

Apply coverage correction: categories with low scan coverage don't appear falsely clean.

### 4.3 Overall Slop Score

```
Slop Score (0-100) = 100 × ( Σ(W_k · C_k) / Σ(W_k) )
```

Where `W_k` are category weights (editable in .sloprc).

**Bands:**

| Score Range | Band | Meaning |
|-------------|------|---------|
| 0–25 | Low | Minimal slop detected |
| 26–50 | Moderate | Some AI-generated patterns present |
| 51–75 | High | Strong signs of AI-generated styling |
| 76–100 | Severe | Overwhelming template-driven design |

### 4.4 Confidence Rating

Derived from extractor coverage:
- **High**: >90% of files parsed successfully, all extractors healthy
- **Medium**: 70-90% coverage or some extractors degraded
- **Low**: <70% coverage or critical extractor failures

Score is always labeled with confidence. Never presented as definitive when coverage
is poor.

---

## 5. Intent Score (Separate Axis)

The Intent Score measures evidence of deliberate design decisions, reported alongside
(not instead of) the Slop Score. A project can have high intent AND high slop —
"intentional but repetitive" is a valid diagnosis.

### 5.1 Graduated Scale (0-100)

**Contributing signals (weighted):**

| Signal | Weight | Detection |
|--------|--------|-----------|
| Custom Tailwind theme entries | 3 per entry (capped at 30) | Count overrides in `tailwind.config.js` `theme.extend` |
| CSS custom properties | 2 per var (capped at 30) | Count `--*` declarations in root/global scope |
| Design token files | 15 per file | Detect `tokens.{css,json,ts,js}`, `variables.css`, `theme.ts` |
| Consistent naming conventions | 10 | Analyze CSS var/class naming for systematic patterns (e.g., `--color-*`, `--space-*`) |
| Font imports (non-default) | 5 per font | Custom Google Fonts or local font declarations |
| Style guide / docs | 5 | Detect `STYLE_GUIDE.md`, `design-system/` directory |

### 5.2 Tier Derivation

| Score Range | Tier | Meaning |
|-------------|------|---------|
| 0–20 | None | Default everything. No design system evidence. |
| 21–55 | Partial | Some customization. A few theme overrides, some vars. |
| 56–100 | Full | Design system present. Extensive tokens, custom theme, documentation. |

### 5.3 Attenuation Rules

Intent tier determines attenuation multipliers for **aesthetics-choice** signals:

| Signal | None | Partial | Full |
|--------|------|---------|------|
| Font Crime | 1.0× | 0.7× | 0.4× |
| Purple Plague | 1.0× | 0.6× | 0.3× |
| Border Radius Maximum | 1.0× | 0.8× | 0.5× |
| Shadow Realm | 1.0× | 0.9× | 0.7× |

**Not attenuated** (entropy/drift signals remain at full weight regardless of intent):
Whitespace Wasteland, Gradient Overload, Buzzword Bingo, Hero Syndrome,
Cookie Cutter Layout, CTA Mania.

Rationale: tokens/themes are evidence of design intent, not design quality. A team
can have tokens and still ship inconsistent, repetitive UI.

---

## 6. Style Parsing & IR

### 6.1 Unified IR Contract

All extractors emit the same intermediate representation:

```typescript
interface StyleFact {
  property: string;         // e.g., "font-family", "padding", "box-shadow"
  value: string;            // resolved value
  rawValue: string;         // original source value
  source: "css" | "tailwind" | "inline" | "css-module";
  file: string;             // source file path
  line: number;
  component?: string;       // enclosing component name (if detectable)
  confidence: "high" | "medium" | "low";
}

interface ColorFact {
  hex: string;              // resolved hex (if resolvable)
  hsl: [number, number, number]; // resolved HSL (if resolvable)
  token?: string;           // original token/var name
  source: "css" | "tailwind" | "inline" | "css-module";
  file: string;
  line: number;
  confidence: "high" | "medium" | "low";
}
```

### 6.2 Extractors (v1)

| Extractor | Parses | Library |
|-----------|--------|---------|
| CSS Extractor | `.css`, `.scss`, `.sass` files | PostCSS |
| Tailwind Extractor | `className` attributes, `@apply` directives, `tailwind.config.js` | Regex + config resolution |
| Inline Style Extractor | `style={{}}` in JSX/TSX | Babel AST traversal |
| CSS Module Extractor | `.module.css` files (same as CSS but scoped) | PostCSS |

**v2**: CSS-in-JS extractor (styled-components, Emotion) — partial + confidence-tagged.

### 6.3 Extractor Health Reporting

Each extractor returns:

```typescript
interface ExtractorResult {
  name: string;
  status: "healthy" | "degraded" | "failed";
  filesAttempted: number;
  filesParsed: number;
  coverage: number;          // filesParsed / filesAttempted
  facts: StyleFact[];
  colors: ColorFact[];
  errors: ExtractorError[];  // individual file parse failures
}
```

Signals declare dependencies. If a dependency extractor is `failed` or `degraded`
below threshold, the signal outputs `status: "insufficient_data"` instead of scoring.

---

## 7. Scan Scope

### 7.1 Scope Resolution (in priority order)

1. **User-specified path**: `/slop-check apps/marketing` scans that path only
2. **Smart UI scope** (no path argument):
   - If `src/` exists → scan `src/`
   - Else scan project root, limited to common UI directories:
     `app/`, `pages/`, `components/`, `src/components/`, `src/app/`,
     `src/pages/`, `ui/`, `layouts/`

### 7.2 Always Excluded

```
node_modules/  .next/  dist/  build/  .turbo/  coverage/  .git/
public/  __tests__/  *.test.*  *.spec.*  *.stories.*
```

Excludes are configurable in `.sloprc`. Users can opt-in to scan tests/stories.

### 7.3 File Extensions

```
.ts  .tsx  .js  .jsx  .css  .scss  .sass  .mdx
```

Plus Tailwind config files (`tailwind.config.*`).

### 7.4 Monorepo Handling

v1: User specifies the app path explicitly (`/slop-check apps/marketing`).
No auto-detection of workspace packages.

v2: Auto-detect workspaces from `package.json`, `pnpm-workspace.yaml`, `turbo.json`.

---

## 8. Two-Pass Architecture

### Fast Pass (always runs)

- All Tier 1 signals: fully deterministic
- Tier 2 signals: heuristic-only (wordlist matching, template pattern detection,
  section fingerprinting, button counting)
- Produces complete JSON output with all scores

### Deep Scan (opt-in)

- **Trigger**: `--deep` flag or `.sloprc` `deepScan.enabled: true`
- **Never automatic**: Fast pass can *recommend* deep scan (when Slop Score exceeds
  threshold or specific Tier 1 patterns make Tier 2 likely) but never runs it
  automatically
- **What it does**: The SKILL.md instructs Claude to re-analyze Tier 2 findings
  using extracted content for nuanced judgment
- **Recommendation format**: "Slop detected (score: 67). Consider `--deep` for
  detailed content and structure analysis."

---

## 9. Configuration (.sloprc)

YAML format. Located at project root. Generated via `/slop-check --init` (v2).

### 9.1 Schema

```yaml
# Scan scope
scope:
  include:                     # Additional include globs (optional)
    - "packages/ui/**"
  exclude:                     # Additional exclude globs (merged with defaults)
    - "legacy/**"
  includeTests: false          # Scan test files
  includeStories: false        # Scan Storybook stories
  includeServerComponents: false

# Signal configuration
signals:
  disabled:                    # Signals to skip entirely
    - "gradient-overload"
  thresholds:                  # Override warn/error thresholds per signal
    font-crime:
      warn: 0.4
      error: 0.7
    shadow-realm:
      warn: 0.5
      error: 0.8
  categoryWeights:             # Override category weights for overall score
    typography-color: 1.0
    spacing-effects: 1.0
    content: 0.8
    structure: 0.8

# Project intent declarations (false-positive suppression)
intent:
  projectType: saas            # portfolio | docs | saas | blog | ecommerce | app | library | other
  palette:
    brandColors:               # Brand colors (suppress hue-based signals for these)
      - "#7C3AED"
      - "#4F46E5"
    allowedHueRanges:          # Hue ranges that are intentional
      - [250, 320]             # Purple range is intentional for this brand
    allowedNeutrals:
      - "gray"
      - "slate"
  tokens:
    cssVarPrefixes:            # CSS var prefixes to recognize as design tokens
      - "--color-"
      - "--space-"
      - "--radius-"
      - "--shadow-"
    tokenFiles:                # Glob patterns for token/theme files
      - "tokens/**"
      - "theme.ts"
    tailwindEnforcement:
      disallowArbitraryValues: false  # Flag arbitrary Tailwind values

# Tier 2 text/structure tuning
tier2:
  buzzwords:
    additions:                 # Add to default buzzword list
      - "leverage"             # Tier B by default, but upgrade for this project
    removals:                  # Remove from default list
      - "AI"                   # Domain-appropriate for this project
    allowlistPhrases:
      - "machine learning"
  cta:
    allowlistLabels:           # CTA labels that shouldn't be flagged
      - "Get Started"
      - "Learn More"
  deepScan:
    enabled: false             # Allow deep scan in this repo
    privacyMode: headings-only # headings-only | snippets (what gets sent to LLM)

# Suppression policy
suppressions:
  allowInline: true            # Whether /* slop-ignore */ comments are honored
  suppressedCountTowardScore: false  # Whether suppressed findings affect the score
```

### 9.2 v1 Minimal Surface

For v1 (feature-lean), only these sections are implemented:
- `signals.disabled`
- `signals.thresholds`
- `scope.exclude`
- `intent.palette.brandColors`
- `intent.tokens.cssVarPrefixes`
- `suppressions.allowInline`

Full schema is v2.

---

## 10. Inline Suppressions

### Syntax

Suppression comments must appear on the line before or same line as the flagged code.

**CSS:**
```css
/* slop-ignore: shadow-realm */
.card { box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
```

**JSX/TSX:**
```tsx
{/* slop-ignore: font-crime */}
<h1 className="font-sans text-4xl">Welcome</h1>
```

**JS/TS:**
```ts
// slop-ignore: purple-plague
const brandColor = '#7C3AED';
```

**Multiple signals:**
```css
/* slop-ignore: shadow-realm, gradient-overload */
```

### Config-based suppressions (.sloprc, v2)

```yaml
suppressions:
  paths:
    "src/legacy/**": ["*"]           # Ignore all signals in legacy code
    "src/hero.tsx": ["shadow-realm", "gradient-overload"]
```

### Reporting

Suppressed findings are still collected and reported in the output JSON under
`suppressions[]`, but do not affect the Slop Score (configurable).

---

## 11. Failure Model

### Per-Extractor Health

Each extractor independently reports its health:
- **healthy**: >95% of files parsed
- **degraded**: 50-95% parsed, or known limitations hit (e.g., dynamic classes)
- **failed**: <50% parsed or critical error

### Signal Dependency Resolution

Signals declare their extractor dependencies:

```typescript
const fontCrime: SignalDefinition = {
  id: "font-crime",
  needs: ["css", "tailwind"],  // requires at least one to be healthy
  // ...
};
```

If all dependencies are `failed`, the signal outputs `status: "insufficient_data"`.
If some are `degraded`, the signal runs but its confidence is reduced.

### Coverage Reporting

The output JSON always includes:

```json
{
  "coverage": {
    "filesAttempted": 147,
    "filesParsed": 142,
    "overallCoverage": 0.966,
    "extractors": [
      { "name": "css", "status": "healthy", "coverage": 1.0 },
      { "name": "tailwind", "status": "degraded", "coverage": 0.89,
        "note": "12 files contain dynamic class expressions" },
      { "name": "inline", "status": "healthy", "coverage": 0.97 }
    ]
  }
}
```

---

## 12. Scanner Output JSON Schema (v1 Draft)

Schema version: `1.0.0`. Tagged with `schemaVersion` in output. SKILL.md reads
`schemaVersion` and adapts. Schema is considered draft in v1; changes increment
the schema version.

```json
{
  "schemaVersion": "1.0.0",
  "scannerVersion": "0.1.0",
  "scoringEpoch": "v1",
  "scanMeta": {
    "duration": 3420,
    "timestamp": "2026-02-21T10:30:00Z",
    "flags": ["--verbose"],
    "configFile": ".sloprc"
  },
  "scope": {
    "method": "smart-ui",
    "resolvedPath": "src/",
    "filesScanned": 142,
    "excludesApplied": ["node_modules/", ".next/", "**/*.test.*"]
  },
  "coverage": {
    "filesAttempted": 147,
    "filesParsed": 142,
    "overallCoverage": 0.966,
    "extractors": [
      {
        "name": "css",
        "status": "healthy",
        "filesAttempted": 23,
        "filesParsed": 23,
        "coverage": 1.0
      }
    ]
  },
  "overall": {
    "slopScore": 67,
    "band": "High",
    "confidence": "Medium"
  },
  "intent": {
    "score": 34,
    "tier": "Partial",
    "evidence": [
      { "type": "tailwind-theme", "count": 8, "description": "8 custom theme entries in tailwind.config.js" },
      { "type": "css-vars", "count": 12, "description": "12 CSS custom properties in global scope" }
    ],
    "attenuations": {
      "font-crime": 0.7,
      "purple-plague": 0.6
    }
  },
  "categories": [
    {
      "id": "typography-color",
      "name": "Typography & Color",
      "score": 0.72,
      "signals": ["font-crime", "purple-plague"]
    },
    {
      "id": "spacing-effects",
      "name": "Spacing & Effects",
      "score": 0.58,
      "signals": ["whitespace-wasteland", "shadow-realm", "border-radius-maximum", "gradient-overload"]
    },
    {
      "id": "content",
      "name": "Content",
      "score": 0.48,
      "signals": ["buzzword-bingo", "hero-syndrome"]
    },
    {
      "id": "structure",
      "name": "Structure",
      "score": 0.63,
      "signals": ["cookie-cutter-layout", "cta-mania"]
    }
  ],
  "signals": [
    {
      "id": "font-crime",
      "name": "Font Crime",
      "category": "typography-color",
      "score": 0.85,
      "rawScore": 0.85,
      "attenuatedScore": 0.595,
      "status": "scored",
      "confidence": "high",
      "evidence": [
        {
          "summary": "1 font family ('Inter') across 47 components",
          "files": ["src/app/layout.tsx:3", "src/components/Card.tsx:12"],
          "detail": "No display or accent font detected. All headings and body text use the same family."
        }
      ]
    }
  ],
  "suppressions": [
    {
      "signal": "shadow-realm",
      "file": "src/components/Hero.tsx",
      "line": 14,
      "type": "inline"
    }
  ],
  "recommendations": {
    "deepScanSuggested": true,
    "reason": "Slop Score exceeds 50 and Hero Syndrome heuristic flagged generic patterns. Consider --deep for nuanced content analysis."
  }
}
```

---

## 13. Report Output

### 13.1 Default Output (~15 lines, progressive disclosure)

```
Slop Score: 67 (High)
Confidence: Medium  |  Files: 142 scanned  |  Intent: Partial (34)

████████▓░ Typography & Color    72
██████▓░░░ Spacing & Effects     58
█████░░░░░ Content               48
██████▓░░░ Structure             63

Top issues:
  Font Crime — 1 font family ('Inter') across 47 components
    → src/app/layout.tsx:3
  Shadow Realm — shadows on 68% of components (34/50)
    → src/components/Card.tsx:12, src/components/Feature.tsx:8
  Whitespace Wasteland — spacing entropy 1.2 (low); 3 unique values in 200 declarations
    → project-wide

Run with --verbose for full details.
Consider --deep for content and structure analysis.
```

### 13.2 --verbose Output

Expands every signal with full evidence, all file:line references, scoring breakdown,
extractor health, and intent evidence details.

### 13.3 --json Output

Raw JSON as defined in §12. For tooling and CI integration.

### 13.4 SKILL.md Report Generation

The SKILL.md uses a structured template + decision tree + few-shot examples:

**Template**: Rigid sections (Score, Categories, Top Issues, Recommendations).
Claude fills in the template from JSON data.

**Decision tree** (conditional tone/severity):
- If score > 75 → lead with urgency, emphasize severity
- If intent score is high → acknowledge design system, frame as "intentional but
  repetitive" rather than "sloppy"
- If only 1-2 signals fire → frame as suggestions, not problems
- If confidence is low → caveat the score, explain coverage gaps
- If deep scan recommended → include the recommendation

**Few-shot examples**: 3-4 example reports (high slop, medium slop, low slop,
design-system project) embedded in the SKILL.md for consistent quality.

---

## 14. CLI Interface

### /slop-check

```
/slop-check [path] [flags]

Arguments:
  path              Directory or file to scan (default: smart UI scope detection)

Flags:
  --verbose         Full signal details, all evidence, file:line references
  --json            Raw JSON output (schema v1)
  --deep            Enable LLM-assisted Tier 2 deep scan
  --full            Scan entire project (ignore smart scope detection)
  --no-cache        Disable cache for this run (v2, no-op in v1)
```

### /slop-fix (v2)

```
/slop-fix [path] [flags]

Arguments:
  path              Directory or file scope

Flags:
  --dry-run         Show patches without applying (default)
  --apply           Apply generated patches

Fix model (tiered):
  1. Deterministic class substitution (Tailwind class replacements)
  2. Config-first transforms (tailwind.config.js theme, global CSS variables)
  3. Interactive LLM-guided session for taste-dependent fixes
```

---

## 15. Scanner Module Architecture

### Pragmatic modules, pipeline internals

```
src/
  extractors/
    css.ts              # PostCSS-based CSS/SCSS parser
    tailwind.ts         # Tailwind class + config extractor
    inline.ts           # JSX inline style extractor
    css-module.ts       # CSS Modules (delegates to css.ts with scope metadata)
    types.ts            # ExtractorResult, ExtractorError interfaces
  ir/
    store.ts            # Collects StyleFact[] and ColorFact[] from all extractors
    types.ts            # StyleFact, ColorFact interfaces
  signals/
    font-crime.ts
    purple-plague.ts
    whitespace-wasteland.ts
    shadow-realm.ts
    border-radius-maximum.ts
    gradient-overload.ts
    hero-syndrome.ts
    buzzword-bingo.ts
    cookie-cutter-layout.ts
    cta-mania.ts
    types.ts            # SignalDefinition, SignalResult interfaces
    registry.ts         # Simple internal registry, runs all enabled signals
  scoring/
    aggregator.ts       # Power mean category aggregation
    intent.ts           # Intent score calculation
    attenuation.ts      # Apply intent-based attenuation
    bands.ts            # Score → band mapping
    types.ts
  output/
    json-reporter.ts    # Produces the JSON output
    types.ts
  config/
    loader.ts           # .sloprc YAML parsing + defaults
    schema.ts           # Config validation
    defaults.ts         # Built-in default thresholds and weights
  scope/
    resolver.ts         # Smart scope detection + file listing
    excludes.ts         # Default + custom exclude patterns
  index.ts              # CLI entry point: scope → extract → IR → signal → score → output
```

No public plugin API in v1. Internal registry pattern allows clean signal addition.
Refactor toward a plugin interface in v2+ if custom signals prove valuable.

---

## 16. Testing Strategy

### Unit Tests

Each signal analyzer tested with crafted IR inputs:
- Edge cases: empty input, single file, extreme values
- Boundary conditions: scores near thresholds
- Expected behavior: known-sloppy input → high score, known-clean → low score

### Integration Tests (Fixture Repos)

3-5 small fixture projects:
- `fixture-slop-heavy/` — AI-generated landing page, all signals should fire
- `fixture-clean/` — Well-designed site with custom theme, low scores expected
- `fixture-tailwind-only/` — Tailwind defaults, moderate scores expected
- `fixture-minimal/` — Single page, minimal styles, edge case handling
- `fixture-design-system/` — Full token system, high intent score expected

### Assertion Style: Golden Score Bands

Each fixture has expected score ranges (min/max per signal, per category, overall).
Tests assert scores fall within bands — resilient to minor algorithm tweaks.

```typescript
// fixture-slop-heavy expectations
expect(result.overall.slopScore).toBeInRange(60, 90);
expect(result.signals.find(s => s.id === 'font-crime').score).toBeInRange(0.7, 1.0);
expect(result.intent.tier).toBe('None');
```

Exact JSON snapshots kept only for debugging, not CI-gating.

---

## 17. Versioning

### Package Versioning

Standard semver on the npm package:
- **Major**: Breaking scoring changes (a score of 50 becomes 65 for the same input)
- **Minor**: New signals added, new features
- **Patch**: Bug fixes, threshold tweaks within reason

### Output Metadata

Every JSON output includes:
- `scannerVersion`: npm package version
- `schemaVersion`: JSON schema version (for SKILL.md compatibility)
- `scoringEpoch`: high-level scoring era identifier (e.g., `"v1"`)

### Cache Invalidation (v2)

Cache keys include `scannerVersion`. Any version bump invalidates caches.
When scoring epoch changes, all cached scores are discarded.

---

## 18. v1 Scope Summary

### Included in v1

- All 10 signals (Tier 1 + Tier 2 with heuristics)
- Scoring model (power mean, 4 categories, bands, confidence)
- Intent Score (graduated + tier derivation + attenuation)
- Smart scope detection + user-specified path
- Progressive report output (default + --verbose + --json)
- --deep flag for opt-in LLM Tier 2 analysis
- Inline suppressions (comment-based)
- Minimal .sloprc (signal disable, thresholds, excludes, brand colors, CSS var prefixes)
- Per-extractor health + coverage reporting
- Fixture-based test suite with golden score bands

### Deferred to v2+

- /slop-fix (deterministic transforms + config-first + interactive LLM)
- Incremental caching (git-diff based, content hash, per-file result persistence)
- CSS-in-JS extractor (styled-components, Emotion)
- --ci mode (exit code based on configurable threshold)
- --watch mode (rerun on file changes)
- --init (generate annotated .sloprc)
- Full .sloprc surface (project type, tier 2 tuning, deep scan privacy, path suppressions)
- Monorepo auto-detection (workspace package scanning)
- Context-aware spacing analysis (group by UI context)
- Standalone binary distribution (compiled scanner)
- Tier 3 signals (Stock Photo Syndrome, Testimonial Factory, Emoji Infestation, Card Carnival)
