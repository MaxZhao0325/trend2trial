# Trend-to-Trial — MVP Issue List

> 10 issues, ordered by dependency (top-down). Complexity: **S** < 1 day, **M** 1-2 days, **L** 3+ days.

---

## #1 — Monorepo scaffolding & toolchain setup

**Complexity:** M

**Description:**
Initialize pnpm workspace monorepo with shared tsconfig, ESLint, Prettier, vitest. Set up root scripts (`lint`, `test`, `build`, `format`). Add `.gitignore`, `.nvmrc` (Node >= 20).

**Directories:** `/`, `packages/`, `apps/`

**Acceptance Criteria:**
- [ ] `pnpm install` succeeds on clean checkout (macOS & Linux)
- [ ] `pnpm lint` and `pnpm format:check` run without errors on empty packages
- [ ] `pnpm test` runs vitest (passes with 0 tests)
- [ ] `pnpm build` invokes tsc across all packages
- [ ] pnpm workspace file lists `packages/*` and `apps/*`

---

## #2 — Trend card data model & schema validation

**Complexity:** S

**Description:**
Define the `TrendCard` TypeScript type in `packages/core`. Create a JSON schema and a validation function. Include fields: id, title, summary, sources[], category (serving | rag | llmops), date, relevanceScore.

**Directories:** `packages/core/src/models/`, `packages/core/src/__tests__/`

**Acceptance Criteria:**
- [ ] `TrendCard` type exported from `packages/core`
- [ ] `validateTrendCard()` returns typed errors for invalid input
- [ ] Unit tests cover: valid card, missing required fields, invalid category, invalid URL in sources
- [ ] Zero use of `any`

---

## #3 — Curate initial trend dataset (>= 5 cards)

**Complexity:** S

**Description:**
Manually research and create >= 5 trend cards in `data/trends/` as JSON files. Cover all three sub-domains (serving, rag, llmops). Each card must pass schema validation.

**Directories:** `data/trends/`

**Acceptance Criteria:**
- [ ] >= 5 JSON files in `data/trends/`, at least 1 per sub-domain
- [ ] All files pass `validateTrendCard()`
- [ ] Each card has >= 2 source URLs pointing to real, accessible content
- [ ] Trends are from the last 90 days

---

## #4 — Trend loader & listing logic

**Complexity:** S

**Description:**
Implement `loadTrends()` in core: read all JSON files from `data/trends/`, validate, sort by relevanceScore desc. Support filtering by category. Return typed array.

**Directories:** `packages/core/src/trends/`, `packages/core/src/__tests__/`

**Acceptance Criteria:**
- [ ] `loadTrends()` returns all valid trend cards sorted by relevance
- [ ] `loadTrends({ category: 'rag' })` filters correctly
- [ ] Invalid JSON files are skipped with a warning (not a crash)
- [ ] Unit tests with fixture data cover: load all, filter, skip invalid

---

## #5 — Recipe model, loader & runner

**Complexity:** L

**Description:**
Define `Recipe` type (id, name, category, tasks[], rubric[]). Implement `loadRecipes()` to scan `recipes/*/tasks.yaml`. Implement `runRecipe()` that executes each task step sequentially (shell commands), streams output, and collects metrics defined in `rubric.yaml`.

**Directories:** `packages/core/src/recipes/`, `packages/core/src/__tests__/`

**Acceptance Criteria:**
- [ ] `Recipe` type and `loadRecipes()` exported from core
- [ ] `runRecipe(id)` executes tasks.yaml steps in order via child_process
- [ ] Step failure halts execution and reports which step failed
- [ ] Metrics from rubric.yaml are collected into a structured result object
- [ ] Unit tests cover: load, run success, run step failure, missing recipe

---

## #6 — Report generator

**Complexity:** M

**Description:**
Implement `generateReport()` in core. Takes recipe run results and produces a REPORT.md string. Must include: experiment purpose (from README.md), environment info (OS, Node version, timestamp), parameters, result summary, reproducible command.

**Directories:** `packages/core/src/reports/`, `packages/core/src/__tests__/`

**Acceptance Criteria:**
- [ ] `generateReport(result)` returns valid markdown string
- [ ] Output contains all 4 required sections per CLAUDE.md spec
- [ ] Environment info is auto-detected (os.platform, os.release, node version)
- [ ] Unit test verifies output structure with a mock result

---

## #7 — CLI: `trends` and `recipe` commands

**Complexity:** M

**Description:**
Create CLI entry point in `packages/cli` using a lightweight arg parser (no heavy framework). Implement subcommands: `trends [--topic]`, `recipe list`, `recipe run <name>`, `recipe report <name>`. Wire to core functions.

**Directories:** `packages/cli/src/`, `packages/cli/bin/`

**Acceptance Criteria:**
- [ ] `trend2trial trends` prints formatted trend cards to stdout
- [ ] `trend2trial trends --topic serving` filters output
- [ ] `trend2trial recipe list` shows available recipes with category
- [ ] `trend2trial recipe run <name>` runs recipe and outputs progress
- [ ] `trend2trial recipe report <name>` generates and writes REPORT.md
- [ ] `trend2trial --help` prints usage info
- [ ] CLI is executable via `pnpm --filter cli start -- <args>` and via bin link

---

## #8 — Recipe: serving-latency

**Complexity:** M — **Status: Done**

**Description:**
Create a recipe that benchmarks HTTP serving latency with a mock server. Measure p95/p99 percentile latency and throughput (requests per second). Uses only Node.js built-ins.

**Directories:** `recipes/serving-latency/`

**Acceptance Criteria:**
- [x] `recipes/serving-latency/` contains README.md, tasks.yaml, rubric.yaml, scaffold/
- [x] README explains what the user learns, prerequisites (Node.js >= 20), expected outcome
- [x] tasks.yaml has steps: start-server, benchmark, stop-server
- [x] rubric.yaml defines metrics: latency_p95_ms, latency_p99_ms, throughput_rps
- [x] Completes in < 30 minutes, no external dependencies

---

## #9 — Recipe: rag-starter

**Complexity:** M — **Status: Done**

**Description:**
Build a minimal in-memory TF-IDF search pipeline with hit rate evaluation. No external services or embeddings required — uses only Node.js built-ins.

**Directories:** `recipes/rag-starter/`

**Acceptance Criteria:**
- [x] `recipes/rag-starter/` contains README.md, tasks.yaml, rubric.yaml, scaffold/
- [x] Pipeline runs fully offline (TF-IDF scoring, sample corpus included)
- [x] rubric.yaml defines metrics: hit_rate, index_build_time_ms
- [x] Completes in < 30 minutes on a standard laptop (no GPU required)

---

## #10 — Recipe: llm-observability-starter

**Complexity:** M — **Status: Done**

**Description:**
Build a mock LLM call chain with structured JSON tracing and analyze trace completeness. Uses only Node.js built-ins, no external API keys required.

**Directories:** `recipes/llm-observability-starter/`

**Acceptance Criteria:**
- [x] `recipes/llm-observability-starter/` contains README.md, tasks.yaml, rubric.yaml, scaffold/
- [x] Mock LLM agent produces structured traces
- [x] Analyzer checks trace completeness and coverage
- [x] rubric.yaml defines metrics: span_coverage, trace_completeness
- [x] Completes in < 30 minutes, no external API keys needed

---

## #11 — Static website: trend cards & recipe catalog

**Complexity:** M

**Description:**
Build a static site in `apps/web` that displays trend cards and recipe catalog. Pure HTML/CSS, built at build time by a simple TypeScript script that reads `data/trends/` and `recipes/*/README.md` and outputs HTML files.

**Directories:** `apps/web/`, `apps/web/scripts/`

**Acceptance Criteria:**
- [ ] `pnpm --filter web build` generates static HTML in `apps/web/dist/`
- [ ] Index page lists all trend cards with title, summary, category, relevance badge
- [ ] Recipes page lists all recipes with name, category, and link to README content
- [ ] Pages are readable without JavaScript enabled
- [ ] Responsive layout (mobile-friendly)
- [ ] `npx serve apps/web/dist` serves the site locally

---

## #12 — End-to-end smoke test & README

**Complexity:** S

**Description:**
Write an E2E test script that runs the full flow: install → build → list trends → run a recipe (use a lightweight test-only recipe) → verify REPORT.md is generated. Update root README.md with quickstart, architecture overview, and contributing guide.

**Directories:** `scripts/`, `README.md`

**Acceptance Criteria:**
- [ ] `scripts/e2e-smoke.sh` runs the full flow and exits 0 on success
- [ ] Script works on both macOS and Linux
- [ ] Root README.md contains: project description, quickstart (< 5 commands), architecture diagram (ASCII), link to docs/, contributing section
- [ ] README reflects actual CLI commands and repo structure
