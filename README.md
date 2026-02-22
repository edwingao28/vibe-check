# 🎭 vibe-check

> **Detect AI-generated slop in web projects** — Scans CSS, Tailwind, and JSX for 14 signals of AI-generated design patterns

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-362%20passing-brightgreen.svg)]()

**vibe-check** is a static analysis tool that detects AI-generated "slop" in web projects. It analyzes your CSS, Tailwind classes, and JSX/TSX files to identify 14 telltale signals of AI-generated design patterns — from gradient overload and emoji infestation to cookie-cutter layouts and testimonial factories.

---

## 🚀 Quick Start

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

## 📊 What It Detects

**14 AI Slop Signals** organized into 4 categories:

### 🎨 **Visual Signals** (Tier 1)
- **Purple Plague** — Overuse of purple/violet gradients (AI's favorite color)
- **Gradient Overload** — Excessive gradient backgrounds
- **Font Crime** — Ultra-thin fonts (font-weight ≤ 200)
- **Emoji Infestation** — Decorative emojis everywhere (zero tolerance)

### 🏗️ **Structural Signals** (Tier 1)
- **Hero Syndrome** — Generic hero sections with buzzword headings
- **Cookie Cutter Layout** — Predictable 3-column feature grids

### 📝 **Content Signals** (Tier 2)
- **Buzzword Bingo** — AI marketing jargon ("revolutionary", "cutting-edge", "seamless")
- **CTA Mania** — Overly aggressive call-to-action buttons
- **Testimonial Factory** — Generic fake testimonials with attribution patterns
- **Card Carnival** — Repeated heading+paragraph card patterns

### 🖼️ **Asset Signals** (Tier 2)
- **Stock Photo Syndrome** — Unsplash/Pexels/placeholder image URLs
- **Whitespace Wasteland** — Excessive spacing (padding/margin > 100px)
- **Shadow Realm** — Overuse of box-shadow effects
- **Border Radius Maximum** — Everything is rounded (border-radius > 20px)

---

## 📖 Usage

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

| Flag | Description |
|------|-------------|
| `--verbose` | Full signal details, all evidence, file:line references |
| `--json` | Raw JSON output (schema v1) |
| `--full` | Scan entire project (ignore smart scope detection) |
| `--deep` | *(No-op in v1)* Enable LLM-assisted Tier 2 deep scan |
| `--no-cache` | *(No-op in v1)* Disable cache for this run |
| `--help` | Show help message |

### Scope Resolution Priority

**vibe-check** auto-detects your frontend source directory:

1. **User-specified path** → uses it directly
2. **`--full` flag** → scans entire project root
3. **Smart UI scope** → checks in priority order:
   - Standard layouts: `src/`, `client/src/`, `frontend/src/`, `web/src/`
   - Monorepo patterns: `apps/web/src/`, `apps/frontend/src/`, `packages/ui/src/`
   - Fallback: Scans `app/`, `components/`, `pages/`, `public/`, `styles/` at root

---

## 📈 Understanding Scores

### Overall Slop Score (0-100)

| Score | Band | Meaning |
|-------|------|---------|
| **0-19** | 🟢 **Clean** | No significant slop detected |
| **20-39** | 🟡 **Mild** | Some AI patterns, mostly acceptable |
| **40-59** | 🟠 **Moderate** | Noticeable AI influence |
| **60-79** | 🔴 **Heavy** | Strong AI generation signals |
| **80-100** | ⚫ **Severe** | Overwhelmingly AI-generated |

### Category Scores

- **Visual** — Color, typography, effects
- **Structural** — Layout, components, grid patterns
- **Content** — Text, buzzwords, CTAs
- **Asset** — Images, spacing, styling

### Confidence Levels

- **High** — 80%+ coverage, all extractors healthy
- **Medium** — 50-80% coverage or minor extractor issues
- **Low** — <50% coverage or significant extraction failures

---

## ⚙️ Configuration

Create a `.slop.json` in your project root:

```json
{
  "scope": {
    "exclude": [
      "**/legacy/**",
      "**/vendor/**"
    ]
  },
  "weights": {
    "visual": 1.0,
    "structural": 1.0,
    "content": 1.0,
    "asset": 1.0
  },
  "thresholds": {
    "purplePlague": 0.4,
    "gradientOverload": 0.5,
    "fontCrime": 0.3
  }
}
```

---

## 📂 Project Structure

```
vibe-check/
├── src/
│   ├── extractors/       # CSS, Tailwind, inline style extraction
│   │   ├── css.ts
│   │   ├── tailwind.ts
│   │   ├── inline.ts     # JSX/TSX text, structure, img extraction
│   │   └── css-module.ts
│   ├── signals/          # 14 slop detection signals
│   │   ├── purple-plague.ts
│   │   ├── gradient-overload.ts
│   │   ├── font-crime.ts
│   │   ├── emoji-infestation.ts
│   │   ├── hero-syndrome.ts
│   │   ├── buzzword-bingo.ts
│   │   ├── cta-mania.ts
│   │   ├── testimonial-factory.ts
│   │   ├── card-carnival.ts
│   │   ├── stock-photo-syndrome.ts
│   │   ├── whitespace-wasteland.ts
│   │   ├── cookie-cutter-layout.ts
│   │   ├── shadow-realm.ts
│   │   ├── border-radius-maximum.ts
│   │   └── registry.ts   # Signal registration and orchestration
│   ├── ir/               # Intermediate representation (IRStore)
│   ├── scoring/          # Intent calculation, attenuation, aggregation
│   ├── scope/            # Smart scope resolution
│   ├── config/           # Config loader and defaults
│   └── output/           # JSON and markdown reporters
├── tests/                # 362 passing tests
├── fixtures/             # Test fixtures (clean, slop-heavy)
└── .claude-plugin/       # Claude Code plugin manifest
```

---

## 🔬 How It Works

### Pipeline

```
1. Scope Resolution → Detect frontend directories
2. Extraction       → CSS, Tailwind, JSX/TSX parsing
3. IR Store         → Centralized fact storage
4. Signal Analysis  → Run 14 detection signals
5. Intent Scoring   → Marketing vs. app vs. docs classification
6. Attenuation      → Adjust scores based on project intent
7. Aggregation      → Compute category and overall scores
8. Reporting        → JSON + Markdown output
```

### Extractors

- **CSS Extractor**: Parses CSS/SCSS with postcss, extracts color, spacing, effects
- **Tailwind Extractor**: Analyzes className attributes for Tailwind utility patterns
- **Inline Extractor**: Babel AST traversal of JSX/TSX for text, structure, images
- **CSS Module Extractor**: Handles `.module.css` files

### Signals

Each signal:
- Analyzes facts from IR Store
- Returns a **score (0-1)** and **evidence** with file:line references
- Supports **attenuation** based on project intent (marketing sites get less penalty)

---

## 🛠️ Development

### Install Dependencies

```bash
bun install
```

### Run Tests

```bash
bun test
# 362 passing tests
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

## 🎯 Example Scan Results

### Marketing Site (Slop-Heavy)

```json
{
  "slopScore": 73.2,
  "band": "heavy",
  "confidence": "high",
  "categories": {
    "visual": 82.5,
    "structural": 68.0,
    "content": 71.3,
    "asset": 70.8
  },
  "signals": {
    "purple-plague": { "score": 0.9, "evidence": [...] },
    "emoji-infestation": { "score": 0.7, "evidence": [...] },
    "card-carnival": { "score": 0.8, "evidence": [...] }
  }
}
```

### Production App (Clean)

```json
{
  "slopScore": 12.4,
  "band": "clean",
  "confidence": "high",
  "categories": {
    "visual": 8.1,
    "structural": 15.2,
    "content": 10.5,
    "asset": 14.7
  }
}
```

---

## 🤝 Contributing

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

---

## 📄 License

MIT © [Wenyao Gao](https://github.com/edwingao28)

---

## 🙏 Acknowledgments

Built with:
- [Babel](https://babeljs.io/) — JSX/TSX parsing
- [PostCSS](https://postcss.org/) — CSS parsing
- [Bun](https://bun.sh/) — Fast testing and builds

Inspired by public discussions on AI-generated web design patterns.

---

## 🔗 Links

- [GitHub Repository](https://github.com/edwingao28/vibe-check)
- [Report Issues](https://github.com/edwingao28/vibe-check/issues)
- [Claude Code Plugins](https://code.claude.com/docs/en/plugin-marketplaces)
