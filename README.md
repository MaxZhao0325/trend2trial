# Trend-to-Trial

**Trend Radar + Trial Playground for Software Engineers exploring AI Infra.**

Track the latest trends in AI Serving, RAG, and LLMOps — each paired with a runnable trial project you can complete in hours, not weeks.

## Quickstart

```bash
# No clone needed — run directly via npx
npx trend2trial recipe list
npx trend2trial recipe init serving-latency ./my-trial
npx trend2trial recipe run ./my-trial
cat ./my-trial/REPORT.md
```

### Development Setup (contributors)

```bash
git clone https://github.com/MaxZhao0325/trend2trial.git
cd trend2trial
pnpm install
pnpm build
node packages/cli/dist/main.js recipe list
```

## Architecture

```
trend2trial/
├── packages/
│   ├── core/       # Data models, trend loader, recipe runner, report generator
│   └── cli/        # CLI entry point (trend2trial command)
├── apps/
│   └── web/        # Static site generator
├── data/
│   └── sample.json # Curated trend data
├── recipes/
│   ├── registry.json                  # Recipe registry for remote fetching
│   ├── serving-latency/               # HTTP serving latency benchmark
│   ├── rag-starter/                   # In-memory TF-IDF search pipeline
│   └── llm-observability-starter/     # Structured tracing for LLM calls
├── docs/           # PRD, MVP, Architecture, Roadmap
└── scripts/        # Utility scripts
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `trend2trial build` | Generate Markdown trend cards from data |
| `trend2trial recipe list` | List all available recipes |
| `trend2trial recipe init <name> <dest>` | Initialize a recipe into a working directory |
| `trend2trial recipe run <dest>` | Run a recipe and generate REPORT.md |

When running from a cloned repo, use `node packages/cli/dist/main.js` in place of `trend2trial`.

## Recipes

| Recipe | Category | Description |
|--------|----------|-------------|
| `serving-latency` | Serving | Mock HTTP server benchmark — measure p95/p99 latency and throughput |
| `rag-starter` | RAG | In-memory TF-IDF search over sample docs with hit rate evaluation |
| `llm-observability-starter` | LLMOps | Mock LLM call chain with structured JSON tracing |

Each recipe uses only Node.js built-ins — no additional dependencies needed.

## Distribution

The CLI is designed to work in two modes:

1. **Remote mode** (default): Users run `npx trend2trial recipe list`. The CLI fetches `recipes/registry.json` from GitHub and downloads recipe files on demand, caching them at `~/.trend2trial/cache/`.
2. **Local mode**: Clone the repo, build, and run. Recipes are read directly from the local `recipes/` directory.

Environment variables for customization:

| Variable | Default | Description |
|----------|---------|-------------|
| `T2T_REPO` | `MaxZhao0325/trend2trial` | GitHub repo for remote fetching |
| `T2T_REF` | `main` | Git ref to fetch from |
| `T2T_CACHE_DIR` | `~/.trend2trial/cache` | Local cache directory |

## Development

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm build` | Build all packages |
| `pnpm test` | Run unit tests (vitest) |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |

## License

MIT
