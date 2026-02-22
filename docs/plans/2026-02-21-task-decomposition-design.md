# Slop Detector — Task Decomposition for Multi-Agent Build

## Strategy

Foundation + parallel. One agent builds the shared foundation (types, IR, config,
scaffold). Then 5 agents work in parallel on independent modules. Two final agents
handle integration and testing.

## Phases

### Phase 1: Foundation (sequential)

**T1: Scaffold + Types + IR + Config**
- Project scaffold: package.json, tsconfig.json, directory structure per SPEC.md $15
- All TypeScript interfaces: StyleFact, ColorFact, ExtractorResult, SignalDefinition,
  SignalResult, config types, output schema types
- IR store: collects StyleFact[] and ColorFact[] from extractors
- Config loader: .sloprc YAML parsing, defaults, validation
- Validation: `npm run build` compiles with zero errors. All interfaces importable
  from their respective modules.

### Phase 2: Modules (parallel, 5 agents)

**T2: Extractors (all 4)**
- CSS extractor (PostCSS)
- Tailwind extractor (class + config resolution)
- Inline style extractor (Babel AST)
- CSS Module extractor (delegates to CSS with scope metadata)
- Dependencies: T1 types + IR
- Validation: Unit tests pass. Each extractor parses a fixture file and emits
  correct StyleFact[]/ColorFact[] with proper ExtractorResult health reporting.

**T3: Tier 1 Signals (6 deterministic)**
- Font Crime, Purple Plague, Whitespace Wasteland, Shadow Realm,
  Border Radius Maximum, Gradient Overload
- Signal registry (internal, no plugin API)
- Dependencies: T1 types + IR
- Validation: Unit tests pass. Each signal scores crafted IR inputs within
  expected bands. Signals with degraded dependencies output insufficient_data.

**T4: Tier 2 Signals (4 heuristic)**
- Hero Syndrome, Buzzword Bingo, Cookie Cutter Layout, CTA Mania
- Tiered buzzword lexicon (A/B/C tiers) + n-gram phrase list
- Dependencies: T1 types + IR
- Validation: Unit tests pass. Buzzword density/co-occurrence scoring works
  correctly. Section fingerprinting produces consistent fingerprints.

**T5: Scoring Engine**
- Power mean category aggregation
- Intent score calculator (graduated scale + tier derivation)
- Attenuation logic (intent tier -> signal multipliers)
- Band mapping (score -> Low/Moderate/High/Severe)
- Confidence derivation from coverage
- Dependencies: T1 types
- Validation: Unit tests pass. Given mock SignalResult[], produces correct
  category scores, overall score, band, confidence, and intent tier with
  attenuation applied.

**T6: Scope + Output + CLI**
- Scope resolver: smart UI directory detection, exclude patterns, file extension
  filtering
- JSON reporter: produces output matching SPEC.md $12 schema
- CLI entry point: wires scope -> extract -> IR -> signals -> score -> output
- Suppression detection: parse slop-ignore comments
- Dependencies: T1 types + config
- Validation: `npx slop-scan --help` runs. Scope resolver correctly identifies
  UI directories. JSON output matches schema. CLI flags work (--verbose, --json,
  --deep, --full, --no-cache).

### Phase 3: Integration (sequential)

**T7: SKILL.md + Plugin Manifest**
- SKILL.md: structured template, decision tree for conditional tone, 3-4 few-shot
  example reports, light persona
- plugin.json manifest
- .sloprc.defaults.yaml
- Dependencies: All prior tasks (needs to reference actual CLI and output format)
- Validation: SKILL.md is valid Markdown. Plugin structure matches SPEC.md $1.
  Default config is valid YAML.

**T8: Integration Tests + Fixtures**
- 3-5 fixture projects (slop-heavy, clean, tailwind-only, minimal, design-system)
- Golden score band test assertions
- Full pipeline integration test (end-to-end scan)
- Dependencies: All prior tasks
- Validation: `npm test` passes. Scanner produces scores within expected bands
  for each fixture. All extractors report healthy on fixture projects.

## Agent Configuration

Each parallel agent (T2-T6) receives:
1. The full SPEC.md for reference
2. The T1 foundation code (types, IR, config) as its working base
3. Its specific task description with acceptance criteria
4. Instructions to write unit tests alongside implementation

Agents report back with:
- Files created/modified
- Test results
- Any issues or deviations from spec
