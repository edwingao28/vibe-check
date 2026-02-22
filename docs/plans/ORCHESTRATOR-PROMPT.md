# Orchestrator Prompt

Copy everything below the line into a new Claude Code session.

---

## Prompt

You are the team lead for building the **slop-detector** plugin. Your job is to orchestrate multiple sub-agents, each completing one task from the implementation plan.

### Project Location

Working directory: `/Users/wenyaogao/dev/osspj/aiagent/vibe-check`

### Required Reading (do this FIRST before anything else)

1. Read `SPEC.md` — the full technical specification
2. Read `docs/plans/2026-02-21-slop-detector-implementation.md` — the implementation plan with 8 tasks

### Execution Strategy: Subagent-Driven Development

You dispatch fresh sub-agents (via the `Task` tool) for each task. Each agent works independently, writes code and tests, and reports back. You review the output between tasks and fix any issues before moving on.

### Phase Execution

**Phase 1 — Foundation (sequential, 1 agent):**

Dispatch a `general-purpose` agent for **Task 1: Scaffold + Types + IR + Config**. Give it:
- The full task description from the plan (Task 1 section)
- Tell it to read `SPEC.md` for reference
- Tell it to run `npm run build` and `npx vitest run` before reporting back
- Tell it to commit when done

Wait for T1 to complete. Verify `npm run build` passes and `npx vitest run` passes. Fix anything broken.

**Phase 2 — Modules (parallel, up to 5 agents):**

Dispatch 5 agents IN PARALLEL using a single message with 5 Task tool calls:

| Agent | Task | Type | Key Instruction |
|-------|------|------|-----------------|
| extractors | T2: Extractors | general-purpose | Build all 4 extractors (CSS, Tailwind, Inline, CSS Module) + color resolver + suppression parser. Write unit tests. Run `npx vitest run tests/extractors` to validate. |
| tier1-signals | T3: Tier 1 Signals | general-purpose | Build 6 deterministic signals + signal registry + math utils. Write unit tests. Run `npx vitest run tests/signals` to validate. |
| tier2-signals | T4: Tier 2 Signals | general-purpose | Build 4 heuristic signals + buzzword lexicon/n-gram data. Write unit tests. Add signals to registry. Run `npx vitest run tests/signals` to validate. |
| scoring | T5: Scoring Engine | general-purpose | Build aggregator (power mean), intent calculator, attenuation, bands. Write unit tests. Run `npx vitest run tests/scoring` to validate. |
| scope-cli | T6: Scope + Output + CLI | general-purpose | Build scope resolver, JSON reporter, CLI entry point. Write unit tests. Run `npx vitest run tests/scope tests/output` and `npm run build && node dist/index.js --help` to validate. |

For each parallel agent prompt, include:
1. "Read `SPEC.md` first for the full technical specification."
2. "Read `docs/plans/2026-02-21-slop-detector-implementation.md` and find your task section (Task N) for detailed implementation instructions."
3. "The project scaffold and all TypeScript types are already built in `src/`. Read the existing type files before writing code to ensure your implementations match the interfaces."
4. "Write unit tests alongside your implementation. Run tests before reporting back."
5. "Do NOT modify files outside your task scope. Only create/modify files listed in your task."

Wait for ALL 5 agents to complete. Then:
- Run `npm run build` to check everything compiles together
- Run `npx vitest run` to check all tests pass
- Fix any integration issues (type mismatches, import errors, conflicting exports)
- Commit all Phase 2 work

**Phase 3 — Integration (sequential, 2 agents):**

Dispatch agent for **Task 7: SKILL.md + Plugin Manifest**. Give it:
- The task description from the plan
- Tell it to read the existing code to understand the actual CLI flags and JSON output format
- No code tests needed — validate that SKILL.md is complete Markdown and plugin.json is valid JSON

Then dispatch agent for **Task 8: Integration Tests + Fixtures**. Give it:
- The task description from the plan
- Tell it to create fixture projects and integration tests
- Tell it to run `npx vitest run tests/integration` to validate
- This is the final validation: if integration tests pass against golden score bands, the build is done

### Rules for You (the Orchestrator)

1. **Read the plan and spec yourself before dispatching any agents.** You need to understand the architecture to review agent output.
2. **Between phases, always run `npm run build` and `npx vitest run`** to catch integration issues early.
3. **If an agent reports issues or deviations**, evaluate whether to fix it yourself or re-dispatch.
4. **After Phase 2 parallel work merges**, there WILL be integration issues (import paths, type mismatches, registry wiring). Budget time to fix these yourself.
5. **Each agent prompt should be self-contained.** Include the task description, file list, and validation commands. Don't assume agents remember previous context.
6. **Use `mode: "bypassPermissions"` for sub-agents** so they can write files and run commands without prompting.
7. **After T8 passes, run the scanner on its own codebase as a smoke test:** `node dist/index.js src/ --json`

### Success Criteria

The build is complete when:
- `npm run build` exits 0
- `npx vitest run` passes all unit + integration tests
- `node dist/index.js fixtures/slop-heavy --json` produces valid JSON with a Slop Score in the 60-90 range
- `skills/slop-check/SKILL.md` exists with structured template, decision tree, and examples
- `.claude-plugin/plugin.json` exists with valid manifest
