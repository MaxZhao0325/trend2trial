# Trend-to-Trial — Architecture

## Overview

Monorepo managed by pnpm workspaces. Two packages, one web app, one data directory.

```
trend2trial/
├── packages/
│   ├── core/           # Shared logic: models, pipeline, recipes, trends
│   │   └── src/
│   │       ├── models/        # TrendCard, TrendItem, Recipe, Registry types
│   │       ├── pipeline/      # Trend fetching pipeline (adapters, dedup, rank, write)
│   │       │   └── adapters/  # RSS + HackerNews adapters
│   │       ├── trends/        # loadTrends(), renderCards()
│   │       ├── recipes/       # loader, runner, fetcher, resolver, report
│   │       └── __tests__/
│   └── cli/            # CLI entry point
│       ├── bin/
│       └── src/
│           ├── commands/      # build, trends, recipe
│           └── __tests__/     # Integration + E2E tests
├── apps/
│   └── web/            # Static site generator
│       ├── scripts/           # build.ts — reads data, emits HTML
│       ├── templates/         # HTML templates
│       └── dist/              # Generated output (gitignored)
├── data/
│   └── trends/                # Curated trend JSON files
├── recipes/                   # Runnable trial recipes + registry.json
├── docs/                      # PRD, MVP, Architecture, Roadmap
└── scripts/                   # CI/dev helper scripts
```

## Data Flow

### Trend Pipeline

```
External Sources                    Pipeline Modules
────────────────                    ────────────────
  arXiv RSS feeds ──→ rssAdapter ─┐
  HackerNews API ──→ hnAdapter  ──┤
  (custom) ──→ customAdapter ─────┘
                                    │
                               dedup() — URL normalization + fuzzy title matching
                                    │
                               rank() — configurable scoring (recency × source × keyword)
                                    │
                          convertToTrendCards() — TrendItem → TrendCard
                                    │
                          writeTrends() — versioned JSON envelope (schema v1)
                                    │
                              ┌─────┼──────┐
                              ▼     ▼      ▼
                           CLI   Web    JSON file
```

### Recipe Workflow

```
User                              GitHub repo
────                              ───────────
npx trend2trial recipe list  ──→  GET recipes/registry.json (cached 5min)
npx trend2trial recipe init  ──→  resolveRecipeDir() → fetchRecipe() → copyScaffold()
npx trend2trial recipe run   ──→  loadRecipe() → validateCommand() → execStep() → generateReport()
                                                                        ↓
                                                                   REPORT.md
```

## Module Boundaries

| Module | Responsibility | Dependencies |
|--------|---------------|------------|
| `packages/core/models` | Type definitions (TrendCard, TrendItem, Recipe, Registry) | None |
| `packages/core/pipeline` | Trend fetching, dedup, ranking, rendering, writing | Node.js std lib, js-yaml (loader only) |
| `packages/core/pipeline/adapters` | RSS + HackerNews data sources | Node.js fetch API |
| `packages/core/trends` | Load trend cards from JSON, render to Markdown | Node.js std lib |
| `packages/core/recipes` | Recipe loading, validation, execution, remote fetching | Node.js std lib, js-yaml |
| `packages/cli` | CLI argument parsing, command dispatch, UI formatting | `trend2trial-core`, picocolors |
| `apps/web` | Static site generation | `trend2trial-core` |
| `data/trends/` | Raw trend data | Nothing (pure data) |
| `recipes/` | Runnable trial projects + registry.json | Independent (run via core) |

## Pipeline Module (`packages/core/src/pipeline/`)

The pipeline module handles automated trend fetching with a pluggable adapter system:

- **Adapter interface** (`adapters/types.ts`): `TrendAdapter` with `name`, `enabled`, `fetch()` returning `TrendItem[]`.
- **RSS adapter** (`adapters/rss.ts`): Fetches from multiple arXiv RSS feeds with retry/timeout.
- **HackerNews adapter** (`adapters/hackernews.ts`): Fetches top stories from HN API, filters AI-related content.
- **Dedup** (`dedup.ts`): URL normalization + Jaccard similarity for fuzzy title matching.
- **Ranker** (`ranker.ts`): Configurable scoring with weights for recency, source, and keyword boost.
- **Card converter** (`card-converter.ts`): Maps `TrendItem` to validated `TrendCard`.
- **Writer** (`writer.ts`): Writes versioned JSON envelope with schema version tracking.
- **Fetch utilities** (`fetch-utils.ts`): Shared retry logic with exponential backoff and concurrency limiter.

## Recipe Fetcher & Resolver (`packages/core/src/recipes/`)

- **Resolver** (`resolver.ts`): `resolveRecipeDir()` tries local `recipes/` first, falls back to remote via `fetchRecipe()`.
- **Fetcher** (`fetcher.ts`): Downloads recipe files from GitHub raw URLs with:
  - SHA256 checksum verification for integrity
  - Path traversal protection
  - Partial download cleanup on failure
  - Network retry with exponential backoff
  - Registry validation against schema version
  - Local cache with TTL-based invalidation
- **Loader** (`loader.ts`): Parses `tasks.yaml` + `rubric.yaml` with strict validation.
- **Runner** (`runner.ts`): Executes recipe steps with command blocklist, consent checks, and fail-fast control.
- **Report** (`report.ts`): Generates Markdown report with metrics, rubric, and reproducible commands.

## Distribution Model

The CLI works in two modes:

1. **Remote mode** (default via npx): `registry.json` is fetched from GitHub, recipe files downloaded on demand, cached at `~/.trend2trial/cache/` with version-based directories and `.complete` markers.
2. **Local mode** (cloned repo): Recipes read directly from the local `recipes/` directory.

## Security

- **Command blocklist**: Blocks `rm -rf /`, `curl|sh`, pipe to eval/sh/bash.
- **Path traversal protection**: Validates all file paths in recipe entries.
- **SHA256 checksums**: Registry entries can specify per-file checksums for integrity verification.
- **Consent prompt**: Users must confirm before recipe commands execute (skippable with `--yes`).
- **Partial cleanup**: Failed downloads are cleaned up to prevent corrupt cache state.

## Key Decisions

- **Minimal runtime dependencies in core** — only `js-yaml` for recipe parsing; everything else uses Node.js built-ins.
- **CLI uses `parseArgs`** — no commander/yargs; hand-rolled suggestion engine for typo correction.
- **Web is static HTML** — build script reads data and emits HTML. No React, no Vite, no framework.
- **Adapter pattern for trends** — new sources added by implementing `TrendAdapter` interface.
- **Registry-based distribution** — `recipes/registry.json` is the source of truth for available recipes.
