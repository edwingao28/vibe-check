---
name: slop-check
description: Scan web projects for AI-generated slop patterns in styling and content
arguments: "[path] [--verbose] [--json] [--deep] [--full]"
---

# /slop-check

Scan a web project for AI-generated "slop" -- telltale patterns of low-effort, template-driven styling and content produced by AI code generators.

## Instructions

Follow these steps precisely when the user invokes `/slop-check`.

### Step 1: Locate the plugin directory

Use the Glob tool to search for `**/vibe-check/dist/index.js` to find the scanner binary. The plugin root is the `vibe-check/` directory that contains `dist/index.js`. If Glob finds nothing, try searching for `**/slop-detector/dist/index.js` or `**/vibe-check/package.json`.

### Step 2: Build the scanner (if needed)

Check whether the `dist/index.js` file was found in Step 1. If not found, the scanner needs to be built:

```bash
npm run build --prefix <plugin-root>
```

### Step 3: Run the scanner

Execute the scanner using the absolute path to `dist/index.js` found in Step 1. Do NOT use `npx slop-scan` — the package is not published to npm.

```bash
node /absolute/path/to/vibe-check/dist/index.js [path] [flags] --json
```

For example, if Glob found `/Users/someone/dev/vibe-check/dist/index.js`, run:

```bash
node /Users/someone/dev/vibe-check/dist/index.js . --json
```

- If the user provided a `[path]` argument, pass it through. If not, use the current working directory.
- If the user provided `--verbose`, `--deep`, or `--full`, pass those flags through.
- Always append `--json` to get machine-readable output. If the user also passed `--json`, the scanner handles the duplicate gracefully.

### Step 4: Parse the JSON output

The scanner outputs a JSON object conforming to the `ScanReport` schema (v1.0.0). Extract these key fields:

| Field           | Path                 | Description                            |
| --------------- | -------------------- | -------------------------------------- |
| Slop Score      | `overall.slopScore`  | 0-100 numeric score                    |
| Band            | `overall.band`       | "Low", "Moderate", "High", or "Severe" |
| Confidence      | `overall.confidence` | "High", "Medium", or "Low"             |
| Intent Score    | `intent.score`       | 0-100 numeric score                    |
| Intent Tier     | `intent.tier`        | "None", "Partial", or "Full"           |
| Files Scanned   | `scope.filesScanned` | Number of files analyzed               |
| Categories      | `categories[]`       | Array of 4 category scores (0-1 scale) |
| Signals         | `signals[]`          | Array of individual signal results     |
| Recommendations | `recommendations`    | Deep scan suggestion and reason        |

### Step 5: Format the report

Use the **Decision Tree** to determine tone, then populate the **Output Template**.

---

## Decision Tree

Apply these rules in order to determine the framing and tone of the report:

### Rule 1: High slop urgency

**If** `overall.slopScore` > 75 (Severe band):

- Lead with urgency. Use phrasing like "This project shows overwhelming signs of AI-generated styling."
- Emphasize the severity of the top-scoring signals.
- Strongly recommend addressing the highest-scoring signals first.

### Rule 2: Design system acknowledgment

**If** `intent.tier` is "Full" (intent score >= 56):

- Acknowledge the design system. Use phrasing like "A design system is present, which is positive."
- Frame high-scoring signals as "intentional but repetitive" rather than "sloppy."
- Note that tokens and theme customization indicate deliberate choices, but the repetitive patterns still affect perceived quality.

### Rule 3: Minor suggestions

**If** only 1-2 signals have scores above their warn threshold (0.4):

- Frame findings as suggestions, not problems.
- Use phrasing like "A couple of minor patterns were detected" rather than "issues found."
- Keep the tone light and advisory.

### Rule 4: Low confidence caveat

**If** `overall.confidence` is "Low":

- Caveat the score prominently. Use phrasing like "Note: Limited file coverage means this score may not reflect the full project."
- Explain what caused low coverage (check `coverage.extractors[]` for degraded/failed extractors).
- Suggest re-running with `--full` if the smart scope missed relevant files.

### Rule 5: Deep scan recommendation

**If** `recommendations.deepScanSuggested` is true:

- Include the recommendation at the end of the report.
- Use the `recommendations.reason` text as context.

---

## Output Template

Format the report using this exact structure. Use block characters to render category score bars.

```
Slop Score: {overall.slopScore} ({overall.band})
Confidence: {overall.confidence}  |  Files: {scope.filesScanned} scanned  |  Intent: {intent.tier} ({intent.score})

{category bars}

Top issues:
  {for each signal where score > warn threshold, sorted by score descending:}
  {signal.name} -- {signal.evidence[0].summary}
    -> {signal.evidence[0].files, comma-separated, max 3}

{if recommendations.deepScanSuggested: "Consider --deep for content and structure analysis."}
{if --verbose flag was passed: full verbose details}
```

### Category Bars

Render each category as a 10-character bar where filled blocks represent the score (0-1 scale, so score of 0.72 = 7 filled + 3 empty). Use these characters:

- Filled: unicode full block (U+2588)
- Partial (last filled position if score ends in 0.5-0.9): unicode dark shade (U+2593)
- Empty: unicode light shade (U+2591)

Format each line as:

```
{bar} {category.name padded to 25 chars} {score as 0-100 integer}
```

Example:

```
██████████ Typography & Color    72
██████░░░░ Spacing & Effects     58
█████░░░░░ Content               48
██████░░░░ Structure             63
```

### Top Issues

List signals that scored above their warn threshold (default 0.4), sorted by `score` descending. For each:

1. Show the signal's `name` and the first evidence `summary`.
2. Below it, show up to 3 `files` references from the evidence, prefixed with `->`.
3. If the signal has a `detail` in its evidence, include it as an indented note.

If no signals exceed the warn threshold, output: "No significant slop patterns detected."

### Verbose Output

When `--verbose` was passed (check `scanMeta.flags` for `"--verbose"`), expand the report with:

1. **All signals** (not just those above threshold), with full evidence details.
2. **Extractor health**: List each extractor from `coverage.extractors[]` with its status, coverage percentage, and any notes.
3. **Intent evidence**: List each item from `intent.evidence[]` with type, count, and description.
4. **Scoring breakdown**: Show raw score, attenuated score, and attenuation multiplier for each signal.
5. **Suppressions**: List any inline suppressions from the `suppressions[]` array.

---

## Deep Scan (--deep flag)

When the `--deep` flag was passed, perform additional LLM-assisted analysis on Tier 2 signals after formatting the base report.

### Deep Scan Procedure

For each Tier 2 signal that scored above 0.2 in the fast pass, re-examine its evidence:

#### Buzzword Bingo

- Read the `evidence[].detail` text which contains the matched buzzwords and their source context.
- Evaluate whether the flagged language is appropriate for the project's domain.
- Consider: Is "leverage" sloppy in a marketing page, or appropriate in a fintech product?
- Adjust your assessment: if the language is domain-appropriate, note it as "contextually justified" and suggest the user consider adding terms to `.sloprc` removals.

#### Hero Syndrome

- Read the `evidence[].detail` which describes the hero section structure.
- Evaluate whether the hero content is genuinely generic/templated or specific to the product.
- A hero with "Welcome to our platform" + "The best solution for your needs" is sloppy.
- A hero with "Track your fleet in real-time" + "GPS monitoring for 10,000+ vehicles" is specific.

#### Cookie Cutter Layout

- Read the `evidence[].detail` which lists the section fingerprints per page.
- Evaluate whether structural similarity is intentional (design system consistency) or lazy (copy-paste).
- If `intent.tier` is "Full", structural similarity is more likely intentional.

#### CTA Mania

- Read the `evidence[].detail` which lists CTA elements per page.
- Evaluate whether the CTA density is justified by the page purpose.
- A pricing page with 5 "Choose Plan" buttons is justified. A blog post with 5 "Sign Up" buttons is not.

### Deep Scan Output

Append a section to the report:

```
--- Deep Scan Analysis ---

{For each re-examined signal:}
{signal.name}: {verdict: "Confirmed" | "Contextually Justified" | "Inconclusive"}
  {Explanation of the LLM assessment}
  {If justified: "Consider adding to .sloprc removals/allowlist."}
```

---

## Few-Shot Examples

### Example 1: High Slop (Severe)

**Scanner JSON (abbreviated):**

```json
{
  "overall": { "slopScore": 82, "band": "Severe", "confidence": "High" },
  "intent": { "score": 8, "tier": "None", "evidence": [], "attenuations": {} },
  "scope": { "filesScanned": 34 },
  "categories": [
    { "id": "typography-color", "name": "Typography & Color", "score": 0.88 },
    { "id": "spacing-effects", "name": "Spacing & Effects", "score": 0.76 },
    { "id": "content", "name": "Content", "score": 0.79 },
    { "id": "structure", "name": "Structure", "score": 0.71 }
  ],
  "signals": [
    {
      "id": "font-crime",
      "name": "Font Crime",
      "score": 0.92,
      "status": "scored",
      "evidence": [
        {
          "summary": "1 font family ('Inter') across 34 components",
          "files": ["src/app/layout.tsx:3"]
        }
      ]
    },
    {
      "id": "purple-plague",
      "name": "Purple Plague",
      "score": 0.84,
      "status": "scored",
      "evidence": [
        {
          "summary": "Purple hues dominate 73% of chromatic colors (41/56)",
          "files": ["src/globals.css:12", "src/components/Hero.tsx:8"]
        }
      ]
    },
    {
      "id": "whitespace-wasteland",
      "name": "Whitespace Wasteland",
      "score": 0.78,
      "status": "scored",
      "evidence": [
        {
          "summary": "Spacing entropy 0.9 (very low); 2 unique values in 187 declarations",
          "files": ["project-wide"]
        }
      ]
    },
    {
      "id": "shadow-realm",
      "name": "Shadow Realm",
      "score": 0.71,
      "status": "scored",
      "evidence": [
        {
          "summary": "Shadows on 74% of components (25/34)",
          "files": [
            "src/components/Card.tsx:5",
            "src/components/Feature.tsx:12"
          ]
        }
      ]
    },
    {
      "id": "buzzword-bingo",
      "name": "Buzzword Bingo",
      "score": 0.81,
      "status": "scored",
      "evidence": [
        {
          "summary": "18 buzzwords detected (density 8.4); phrases: 'revolutionize your workflow', 'in today's fast-paced world'",
          "files": ["src/app/page.tsx:15", "src/components/Hero.tsx:4"]
        }
      ]
    },
    {
      "id": "hero-syndrome",
      "name": "Hero Syndrome",
      "score": 0.9,
      "status": "scored",
      "evidence": [
        {
          "summary": "Generic hero template: h1 + paragraph + CTA button, content is non-specific",
          "files": ["src/components/Hero.tsx:1"]
        }
      ]
    }
  ],
  "recommendations": {
    "deepScanSuggested": true,
    "reason": "Slop Score exceeds 75 with multiple Tier 2 signals firing. Deep scan can evaluate whether content is truly generic."
  }
}
```

**Expected output:**

```
Slop Score: 82 (Severe)
Confidence: High  |  Files: 34 scanned  |  Intent: None (8)

This project shows overwhelming signs of AI-generated styling. Nearly every signal is firing, and no design system or intentional customization was detected.

█████████░ Typography & Color     88
████████░░ Spacing & Effects      76
████████░░ Content                79
███████░░░ Structure              71

Top issues:
  Font Crime -- 1 font family ('Inter') across 34 components
    -> src/app/layout.tsx:3
  Hero Syndrome -- Generic hero template: h1 + paragraph + CTA button, content is non-specific
    -> src/components/Hero.tsx:1
  Purple Plague -- Purple hues dominate 73% of chromatic colors (41/56)
    -> src/globals.css:12, src/components/Hero.tsx:8
  Buzzword Bingo -- 18 buzzwords detected (density 8.4); phrases: 'revolutionize your workflow', 'in today's fast-paced world'
    -> src/app/page.tsx:15, src/components/Hero.tsx:4
  Whitespace Wasteland -- Spacing entropy 0.9 (very low); 2 unique values in 187 declarations
    -> project-wide
  Shadow Realm -- Shadows on 74% of components (25/34)
    -> src/components/Card.tsx:5, src/components/Feature.tsx:12

Consider --deep for content and structure analysis.
```

---

### Example 2: Medium Slop (Moderate)

**Scanner JSON (abbreviated):**

```json
{
  "overall": { "slopScore": 45, "band": "Moderate", "confidence": "High" },
  "intent": {
    "score": 34,
    "tier": "Partial",
    "evidence": [
      {
        "type": "tailwind-theme",
        "count": 8,
        "description": "8 custom theme entries in tailwind.config.js"
      },
      {
        "type": "css-vars",
        "count": 5,
        "description": "5 CSS custom properties in global scope"
      }
    ],
    "attenuations": {
      "font-crime": 0.7,
      "purple-plague": 0.6,
      "border-radius-maximum": 0.8,
      "shadow-realm": 0.9
    }
  },
  "scope": { "filesScanned": 67 },
  "categories": [
    { "id": "typography-color", "name": "Typography & Color", "score": 0.42 },
    { "id": "spacing-effects", "name": "Spacing & Effects", "score": 0.51 },
    { "id": "content", "name": "Content", "score": 0.38 },
    { "id": "structure", "name": "Structure", "score": 0.44 }
  ],
  "signals": [
    {
      "id": "font-crime",
      "name": "Font Crime",
      "score": 0.49,
      "rawScore": 0.7,
      "attenuatedScore": 0.49,
      "status": "scored",
      "evidence": [
        {
          "summary": "1 font family ('Inter') across 42 components; some custom theme entries detected",
          "files": ["src/app/layout.tsx:3"]
        }
      ]
    },
    {
      "id": "whitespace-wasteland",
      "name": "Whitespace Wasteland",
      "score": 0.55,
      "status": "scored",
      "evidence": [
        {
          "summary": "Spacing entropy 1.8 (moderate); 5 unique values in 312 declarations",
          "files": ["project-wide"]
        }
      ]
    },
    {
      "id": "shadow-realm",
      "name": "Shadow Realm",
      "score": 0.45,
      "rawScore": 0.5,
      "attenuatedScore": 0.45,
      "status": "scored",
      "evidence": [
        {
          "summary": "Shadows on 52% of components (35/67)",
          "files": [
            "src/components/Card.tsx:12",
            "src/components/Feature.tsx:8"
          ]
        }
      ]
    }
  ],
  "recommendations": { "deepScanSuggested": false, "reason": "" }
}
```

**Expected output:**

```
Slop Score: 45 (Moderate)
Confidence: High  |  Files: 67 scanned  |  Intent: Partial (34)

Some AI-generated patterns are present, but custom theme entries and CSS variables indicate partial design intent. Scores have been attenuated for signals where design choices may be deliberate.

████░░░░░░ Typography & Color     42
█████░░░░░ Spacing & Effects      51
████░░░░░░ Content                38
████░░░░░░ Structure              44

Top issues:
  Whitespace Wasteland -- Spacing entropy 1.8 (moderate); 5 unique values in 312 declarations
    -> project-wide
  Font Crime -- 1 font family ('Inter') across 42 components; some custom theme entries detected
    -> src/app/layout.tsx:3
  Shadow Realm -- Shadows on 52% of components (35/67)
    -> src/components/Card.tsx:12, src/components/Feature.tsx:8

Run with --verbose for full details.
```

---

### Example 3: Low Slop (Low)

**Scanner JSON (abbreviated):**

```json
{
  "overall": { "slopScore": 15, "band": "Low", "confidence": "High" },
  "intent": {
    "score": 72,
    "tier": "Full",
    "evidence": [
      {
        "type": "tailwind-theme",
        "count": 22,
        "description": "22 custom theme entries in tailwind.config.ts"
      },
      {
        "type": "css-vars",
        "count": 18,
        "description": "18 CSS custom properties in global scope"
      },
      {
        "type": "design-token-file",
        "count": 2,
        "description": "Design token files detected: tokens/colors.ts, tokens/spacing.ts"
      },
      {
        "type": "naming-convention",
        "count": 1,
        "description": "Consistent --color-*, --space-* naming pattern"
      }
    ],
    "attenuations": {
      "font-crime": 0.4,
      "purple-plague": 0.3,
      "border-radius-maximum": 0.5,
      "shadow-realm": 0.7
    }
  },
  "scope": { "filesScanned": 98 },
  "categories": [
    { "id": "typography-color", "name": "Typography & Color", "score": 0.12 },
    { "id": "spacing-effects", "name": "Spacing & Effects", "score": 0.18 },
    { "id": "content", "name": "Content", "score": 0.14 },
    { "id": "structure", "name": "Structure", "score": 0.1 }
  ],
  "signals": [
    {
      "id": "font-crime",
      "name": "Font Crime",
      "score": 0.2,
      "rawScore": 0.5,
      "attenuatedScore": 0.2,
      "status": "scored",
      "evidence": [
        {
          "summary": "2 font families ('Inter', 'Playfair Display') across 52 components",
          "files": ["src/app/layout.tsx:3"]
        }
      ]
    },
    {
      "id": "whitespace-wasteland",
      "name": "Whitespace Wasteland",
      "score": 0.22,
      "status": "scored",
      "evidence": [
        {
          "summary": "Spacing entropy 2.8 (healthy); 11 unique values in 445 declarations",
          "files": ["project-wide"]
        }
      ]
    }
  ],
  "recommendations": { "deepScanSuggested": false, "reason": "" }
}
```

**Expected output:**

```
Slop Score: 15 (Low)
Confidence: High  |  Files: 98 scanned  |  Intent: Full (72)

Minimal slop detected. A comprehensive design system is present with custom tokens, theme entries, and consistent naming conventions. This project shows strong evidence of deliberate design decisions.

█░░░░░░░░░ Typography & Color     12
██░░░░░░░░ Spacing & Effects      18
█░░░░░░░░░ Content                14
█░░░░░░░░░ Structure              10

No significant slop patterns detected.
```

---

### Example 4: Design System with Moderate Slop (Intentional but Repetitive)

**Scanner JSON (abbreviated):**

```json
{
  "overall": { "slopScore": 35, "band": "Moderate", "confidence": "Medium" },
  "intent": {
    "score": 68,
    "tier": "Full",
    "evidence": [
      {
        "type": "tailwind-theme",
        "count": 18,
        "description": "18 custom theme entries in tailwind.config.ts"
      },
      {
        "type": "css-vars",
        "count": 30,
        "description": "30 CSS custom properties in global scope"
      },
      {
        "type": "design-token-file",
        "count": 1,
        "description": "Design token file detected: theme.ts"
      },
      {
        "type": "style-guide",
        "count": 1,
        "description": "STYLE_GUIDE.md detected"
      }
    ],
    "attenuations": {
      "font-crime": 0.4,
      "purple-plague": 0.3,
      "border-radius-maximum": 0.5,
      "shadow-realm": 0.7
    }
  },
  "scope": { "filesScanned": 112 },
  "categories": [
    { "id": "typography-color", "name": "Typography & Color", "score": 0.15 },
    { "id": "spacing-effects", "name": "Spacing & Effects", "score": 0.48 },
    { "id": "content", "name": "Content", "score": 0.32 },
    { "id": "structure", "name": "Structure", "score": 0.55 }
  ],
  "signals": [
    {
      "id": "whitespace-wasteland",
      "name": "Whitespace Wasteland",
      "score": 0.52,
      "status": "scored",
      "evidence": [
        {
          "summary": "Spacing entropy 1.4 (low); 4 unique values in 520 declarations",
          "files": ["project-wide"]
        }
      ]
    },
    {
      "id": "cookie-cutter-layout",
      "name": "Cookie Cutter Layout",
      "score": 0.61,
      "status": "scored",
      "evidence": [
        {
          "summary": "5 of 8 pages share identical section fingerprint: hero -> feature-grid -> testimonial -> cta-block -> footer",
          "files": [
            "src/app/page.tsx",
            "src/app/pricing/page.tsx",
            "src/app/about/page.tsx"
          ]
        }
      ]
    },
    {
      "id": "cta-mania",
      "name": "CTA Mania",
      "score": 0.48,
      "status": "scored",
      "evidence": [
        {
          "summary": "6 CTA buttons on pricing page, 5 on landing page",
          "files": ["src/app/pricing/page.tsx:24", "src/app/page.tsx:18"]
        }
      ]
    }
  ],
  "recommendations": {
    "deepScanSuggested": true,
    "reason": "Design system detected but structural repetition is high. Deep scan can evaluate whether layout similarity is intentional consistency or copy-paste."
  }
}
```

**Expected output:**

```
Slop Score: 35 (Moderate)
Confidence: Medium  |  Files: 112 scanned  |  Intent: Full (68)

A design system is present with tokens, custom theme, and a style guide -- which is positive. However, some patterns appear intentional but repetitive. The structural similarity across pages and spacing monotony may reflect design system consistency taken too far rather than deliberate variety.

██░░░░░░░░ Typography & Color     15
█████░░░░░ Spacing & Effects      48
███░░░░░░░ Content                32
██████░░░░ Structure              55

Top issues:
  Cookie Cutter Layout -- 5 of 8 pages share identical section fingerprint: hero -> feature-grid -> testimonial -> cta-block -> footer
    -> src/app/page.tsx, src/app/pricing/page.tsx, src/app/about/page.tsx
  Whitespace Wasteland -- Spacing entropy 1.4 (low); 4 unique values in 520 declarations
    -> project-wide
  CTA Mania -- 6 CTA buttons on pricing page, 5 on landing page
    -> src/app/pricing/page.tsx:24, src/app/page.tsx:18

Consider --deep for content and structure analysis.
```

---

## Reference

### Signal Names and Categories

| Signal ID               | Name                  | Category           |
| ----------------------- | --------------------- | ------------------ |
| `font-crime`            | Font Crime            | Typography & Color |
| `purple-plague`         | Purple Plague         | Typography & Color |
| `whitespace-wasteland`  | Whitespace Wasteland  | Spacing & Effects  |
| `shadow-realm`          | Shadow Realm          | Spacing & Effects  |
| `border-radius-maximum` | Border Radius Maximum | Spacing & Effects  |
| `gradient-overload`     | Gradient Overload     | Spacing & Effects  |
| `buzzword-bingo`        | Buzzword Bingo        | Content            |
| `hero-syndrome`         | Hero Syndrome         | Content            |
| `cookie-cutter-layout`  | Cookie Cutter Layout  | Structure          |
| `cta-mania`             | CTA Mania             | Structure          |

### Score Bands

| Score  | Band     |
| ------ | -------- |
| 0-25   | Low      |
| 26-50  | Moderate |
| 51-75  | High     |
| 76-100 | Severe   |

### Intent Tiers

| Intent Score | Tier    |
| ------------ | ------- |
| 0-20         | None    |
| 21-55        | Partial |
| 56-100       | Full    |

### Default Warn/Error Thresholds

All signals default to `warn: 0.4`, `error: 0.7`. Configurable via `.sloprc`.
