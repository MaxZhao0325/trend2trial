# Trend-to-Trial — Architecture

## Overview

Monorepo managed by pnpm workspaces. Three packages, one data directory.

```
trend2trial/
├── packages/
│   ├── core/           # Shared logic: models, loaders, renderers
│   │   └── src/
│   │       ├── models/        # TrendCard type & validation
│   │       ├── trends/        # loadTrends(), filterTrends()
│   │       ├── recipes/       # loadRecipes(), runRecipe()
│   │       ├── reports/       # generateReport()
│   │       └── __tests__/
│   └── cli/            # CLI entry point
│       ├── bin/
│       └── src/
│           └── commands/      # build, trends, recipe
├── apps/
│   └── web/            # Static site generator
│       ├── scripts/           # build.ts — reads data, emits HTML
│       ├── templates/         # HTML templates
│       └── dist/              # Generated output (gitignored)
├── data/
│   └── trends/                # Curated trend JSON files
├── recipes/                   # Runnable trial recipes
├── docs/                      # PRD, MVP, Architecture, Issues
└── scripts/                   # CI/dev helper scripts
```

## Data Flow

```
                ┌─────────────┐
                │ data/trends │  JSON files (source of truth)
                └──────┬──────┘
                       │
              loadTrends() — packages/core
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌─────────┐  ┌───────────┐  ┌─────────┐
   │   CLI   │  │    Web    │  │  Tests  │
   │ build   │  │  build.ts │  │ vitest  │
   └────┬────┘  └─────┬─────┘  └─────────┘
        │              │
        ▼              ▼
  docs/cards/*.md   apps/web/dist/*.html
```

## Module Boundaries

| Module | Responsibility | Depends on |
|--------|---------------|------------|
| `packages/core` | Data models, loading, validation, rendering | Node.js std lib only |
| `packages/cli` | CLI argument parsing, command dispatch | `@trend2trial/core` |
| `apps/web` | Static site generation | `@trend2trial/core` |
| `data/trends/` | Raw trend data | Nothing (pure data) |
| `recipes/` | Runnable trial projects | Independent (run via core) |

## Extension Points

### Adding a new trend source
1. Create a JSON file in `data/trends/` following the TrendCard schema.
2. Run `trend2trial build` to regenerate cards.

### Adding a new recipe
1. Create `recipes/<name>/` with README.md, tasks.yaml, rubric.yaml, scaffold/.
2. Core auto-discovers it via directory scan.

## Distribution Model (Planned — v0.5)

```
User                              GitHub repo
────                              ───────────
npx trend2trial recipe list  ──→  GET recipes/registry.json
npx trend2trial recipe run   ──→  download recipe files → ~/.trend2trial/cache/
                                  copy scaffold → user dir → execute → REPORT.md
```

- CLI published to npm — users run via `npx trend2trial`, no clone needed.
- Recipes fetched on demand from GitHub raw/releases; cached locally.
- `recipes/registry.json` is the source of truth for available recipes.

## Key Decisions

- **No runtime dependencies in core** — only Node.js built-ins for loading/validation.
- **CLI uses minimal arg parsing** — no commander/yargs; hand-rolled or `parseArgs` (Node 18.3+).
- **Web is static HTML** — build script reads data and emits HTML. No React, no Vite, no framework.
- **Data committed to repo** — trends JSON is version-controlled, not fetched at runtime in MVP.
- **Remote recipe fetching (planned)** — recipes will be downloaded at runtime so users don't need to clone the repo.
