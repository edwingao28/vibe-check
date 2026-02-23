# vibe-check

> **Detect AI-generated slop in web projects** -- Scans CSS, Tailwind, and JSX for 18 signals of AI-generated design patterns

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-445%20passing-brightgreen.svg)]()

**vibe-check** is a static analysis tool that detects AI-generated "slop" in web projects. It analyzes your CSS, Tailwind classes, JSX/TSX files, project structure, and dependency graph to identify 18 telltale signals of AI-generated design patterns -- from gradient overload and emoji infestation to scaffold bloat and dead dependencies.

---

## Quick Start

Get up and running in under 2 minutes:

### 1. Install as Claude Code Plugin

```bash
/plugin marketplace add https://github.com/edwingao28/vibe-check.git
/plugin install vibe-check
```

### 2. Run Your First Scan

**In Claude Code:**

```bash
# Smart scope scan (auto-detects src/, client/src/, frontend/, etc.)
/slop-check

# Scan a specific directory
/slop-check apps/marketing

# Full project scan with verbose output
/slop-check --full --verbose
```

**As standalone CLI:**

```bash
slop-scan
slop-scan apps/marketing
slop-scan --full --verbose
```

### 3. Review Results

**Terminal Output**: Structured JSON with scores, signals, and evidence
**Markdown Report**: `slop-report.md` generated automatically with fix suggestions

---

## What It Detects

**18 AI Slop Signals** organized into 4 categories:

### Typography & Color (Tier 1, weight 1.0)

- **Purple Plague** -- Overuse of purple/violet gradients (AI's favorite color)
- **Font Crime** -- Ultra-thin fonts (font-weight <= 200)

### Spacing & Effects (Tier 1, weight 1.0)

- **Gradient Overload** -- Excessive gradient backgrounds (grouped by proximity)
- **Whitespace Wasteland** -- Low entropy in spacing values
- **Shadow Realm** -- Overuse of box-shadow effects
- **Border Radius Maximum** -- Everything is rounded (border-radius > 20px)

### Content (Tier 2, weight 0.8)

- **Buzzword Bingo** -- AI marketing jargon ("revolutionary", "cutting-edge", "seamless")
- **Hero Syndrome** -- Generic hero sections with buzzword headings
- **Placeholder Content** -- **NEW** Fake names, lorem ipsum, placeholder metrics ($99.99/mo, 10,000+)
- **Emoji Infestation** -- Decorative emojis everywhere
- **Testimonial Factory** -- Generic fake testimonials with attribution patterns
- **Card Carnival** -- Repeated heading+paragraph card patterns
- **Stock Photo Syndrome** -- Unsplash/Pexels/placeholder image URLs

### Structure (Tier 2, weight 0.8)

- **Cookie Cutter Layout** -- Identical page structures (UI library files excluded)
- **CTA Mania** -- Excessive call-to-action buttons (app buttons filtered, marketing vs app thresholds)
- **Scaffold Bloat** -- **NEW** Excessive UI library components vs custom code (e.g., 47 shadcn components vs 4 custom)
- **AI Scaffold Signature** -- **NEW** Detects Replit, Bolt, v0, Lovable, Cursor artifacts
- **Dead Dependency** -- **NEW** Heavy packages installed but never imported (framer-motion, three.js, recharts, etc.)

---

## Usage

### Basic Commands

**In Claude Code:**

```bash
# Smart scope detection (checks src/, client/src/, apps/web/, etc.)
/slop-check

# Scan specific directory or file
/slop-check src/components
/slop-check apps/marketing/landing.tsx

# Full project scan (ignores smart scope)
/slop-check --full

# Verbose output with all evidence and file:line references
/slop-check --verbose

# Raw JSON output only (no markdown report)
/slop-check --json
```

**Standalone CLI:**

```bash
slop-scan [same options as above]
```

### CLI Flags

| Flag         | Description                                             |
| ------------ | ------------------------------------------------------- |
| `--verbose`  | Full signal details, all evidence, file:line references |
| `--json`     | Raw JSON output (schema v1)                             |
| `--full`     | Scan entire project (ignore smart scope detection)      |
| `--deep`     | _(No-op in v1)_ Enable LLM-assisted Tier 2 deep scan    |
| `--no-cache` | _(No-op in v1)_ Disable cache for this run              |
| `--help`     | Show help message                                       |

### Scope Resolution Priority

**vibe-check** auto-detects your frontend source directory:

1. **User-specified path** -- uses it directly
2. **`--full` flag** -- scans entire project root
3. **Smart UI scope** -- checks in priority order:
   - Standard layouts: `src/`, `client/src/`, `frontend/src/`, `web/src/`
   - Monorepo patterns: `apps/web/src/`, `apps/frontend/src/`, `packages/ui/src/`
   - Fallback: Scans `app/`, `components/`, `pages/`, `public/`, `styles/` at root

---

## Understanding Scores

### Overall Slop Score (0-100)

| Score      | Band         | Meaning                             |
| ---------- | ------------ | ----------------------------------- |
| **0-19**   | **Clean**    | No significant slop detected        |
| **20-39**  | **Mild**     | Some AI patterns, mostly acceptable |
| **40-59**  | **Moderate** | Noticeable AI influence             |
| **60-79**  | **Heavy**    | Strong AI generation signals        |
| **80-100** | **Severe**   | Overwhelmingly AI-generated         |

### Category Scores

- **Typography & Color** (weight 1.0) -- Color palettes, font choices
- **Spacing & Effects** (weight 1.0) -- Gradients, shadows, border radius, spacing
- **Content** (weight 0.8) -- Text, buzzwords, CTAs, placeholder data
- **Structure** (weight 0.8) -- Layout patterns, scaffolding, dependencies

### Intent-Based Attenuation

Projects with evidence of deliberate design (custom CSS variables, design tokens, naming conventions) get attenuated scores on 4 signals: font-crime, purple-plague, border-radius-maximum, shadow-realm. Framework-default CSS variables (shadcn/ui, Tailwind) are filtered out before calculating intent.

### Confidence Levels

- **High** -- 80%+ coverage, all extractors healthy
- **Medium** -- 50-80% coverage or minor extractor issues
- **Low** -- <50% coverage or significant extraction failures

---

## Configuration

Create a `.slop.json` in your project root:

```json
{
  "scope": {
    "exclude": ["**/legacy/**", "**/vendor/**"]
  },
  "weights": {
    "typography-color": 1.0,
    "spacing-effects": 1.0,
    "content": 0.8,
    "structure": 0.8
  }
}
```

---

## Project Structure

```
vibe-check/
├── src/
│   ├── extractors/       # CSS, Tailwind, inline style extraction
│   │   ├── css.ts
│   │   ├── tailwind.ts
│   │   ├── inline.ts     # JSX/TSX text, structure, img extraction
│   │   └── css-module.ts
│   ├── signals/          # 18 slop detection signals
│   │   ├── font-crime.ts
│   │   ├── purple-plague.ts
│   │   ├── gradient-overload.ts
│   │   ├── whitespace-wasteland.ts
│   │   ├── shadow-realm.ts
│   │   ├── border-radius-maximum.ts
│   │   ├── buzzword-bingo.ts
│   │   ├── hero-syndrome.ts
│   │   ├── placeholder-content.ts    # NEW v0.2
│   │   ├── emoji-infestation.ts
│   │   ├── testimonial-factory.ts
│   │   ├── card-carnival.ts
│   │   ├── stock-photo-syndrome.ts
│   │   ├── cookie-cutter-layout.ts
│   │   ├── cta-mania.ts
│   │   ├── scaffold-bloat.ts         # NEW v0.2
│   │   ├── ai-scaffold-signature.ts  # NEW v0.2
│   │   ├── dead-dependency.ts        # NEW v0.2
│   │   ├── data/                     # Buzzword lexicon, placeholder patterns
│   │   └── registry.ts              # Signal registration and orchestration
│   ├── ir/               # Intermediate representation (IRStore)
│   ├── scoring/          # Intent calculation, attenuation, aggregation
│   ├── scope/            # Smart scope resolution
│   ├── config/           # Config loader and defaults
│   └── output/           # JSON and markdown reporters
├── tests/                # 445 passing tests
├── fixtures/             # Test fixtures (clean, slop-heavy)
└── .claude-plugin/       # Claude Code plugin manifest
```

---

## How It Works

### Pipeline

```
1. Scope Resolution → Detect frontend directories, build file list
2. Extraction       → CSS, Tailwind, JSX/TSX parsing → IR facts
3. IR Store         → Centralized fact storage (Style, Color, Text, Structural)
4. Signal Analysis  → Run 18 detection signals (some use file list + project root)
5. Intent Scoring   → Custom CSS vars, design tokens → None/Partial/Full tier
6. Attenuation      → Adjust 4 attenuatable signals based on intent tier
7. Aggregation      → Power mean (p=2) per category, weighted sum overall
8. Reporting        → JSON + Markdown output
```

### Extractors

- **CSS Extractor**: Parses CSS/SCSS with postcss, extracts color, spacing, effects
- **Tailwind Extractor**: Analyzes className attributes for Tailwind utility patterns
- **Inline Extractor**: Babel AST traversal of JSX/TSX for text, structure, images
- **CSS Module Extractor**: Handles `.module.css` files

### Signals

Each signal:

- Analyzes facts from IR Store (and optionally file list / project root)
- Returns a **score (0-1)** and **evidence** with file:line references
- Supports **attenuation** based on project intent

---

## Development

### Install Dependencies

```bash
bun install
```

### Run Tests

```bash
bun test
# 445 passing tests across 31 test files
```

### Build

```bash
bun run build
# Outputs to dist/
```

### Local Testing

```bash
# Link plugin for local development
/plugin link /path/to/vibe-check

# Run on test fixtures (in Claude Code)
/slop-check fixtures/slop-heavy --verbose
/slop-check fixtures/clean --full

# Or use standalone CLI
slop-scan fixtures/slop-heavy --verbose
slop-scan fixtures/clean --full
```

---

## v0.2.0 Changelog

### New Signals (4)

- **Scaffold Bloat** -- Detects excessive UI library component ratio vs custom code
- **Placeholder Content** -- Detects fake names, lorem ipsum, placeholder metrics
- **AI Scaffold Signature** -- Detects Replit, Bolt, v0, Lovable, Cursor platform artifacts
- **Dead Dependency** -- Detects heavy packages (framer-motion, three.js, recharts, etc.) installed but never imported

### Signal Improvements (6)

- **Gradient Overload** -- Groups Tailwind gradient declarations by proximity (from-/via-/to- = 1 instance, not 3)
- **CTA Mania** -- Filters app/functional buttons (Edit, Save, Delete), separate thresholds for marketing vs app pages
- **Buzzword Bingo** -- Lowered detection threshold, added Tier C words and 5 new phrase patterns
- **Card Carnival** -- Increased pair gap (10 -> 15 lines), pseudo-card detection for untagged JSX headings
- **Cookie Cutter Layout** -- Excludes UI library files (shadcn/ui, Radix, node_modules)
- **Intent Detection** -- Filters 60+ framework-default CSS variables (shadcn/ui, Tailwind) from intent score

### Infrastructure

- Extended `SignalContext` with `fileList` and `projectRoot` for file-level analysis
- 445 tests across 31 test files (up from 362 across 27)

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-signal`)
3. Add tests for new signals (`tests/signals/`)
4. Ensure all tests pass (`bun test`)
5. Submit a PR

### Adding a New Signal

See existing signals in `src/signals/` for examples. Each signal:

1. Implements `SignalDefinition` interface
2. Declares `needs` (which extractors it depends on)
3. Defines `analyze(ctx: SignalContext): SignalResult`
4. Registers in `src/signals/registry.ts`
5. Adds signal ID to a category in `src/scoring/categories.ts`

---

## License

MIT (c) [Wenyao Gao](https://github.com/edwingao28)

---

## Acknowledgments

Built with:

- [Babel](https://babeljs.io/) -- JSX/TSX parsing
- [PostCSS](https://postcss.org/) -- CSS parsing
- [Bun](https://bun.sh/) -- Fast testing and builds

Inspired by public discussions on AI-generated web design patterns.

---

## Links

- [GitHub Repository](https://github.com/edwingao28/vibe-check)
- [Report Issues](https://github.com/edwingao28/vibe-check/issues)
- [Claude Code Plugins](https://code.claude.com/docs/en/plugin-marketplaces)
