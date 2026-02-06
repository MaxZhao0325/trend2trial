# Trend-to-Trial — MVP Scope

## Focus Area

**AI Infra** — specifically three sub-domains:

| Sub-domain  | Example trends                                                    |
| ----------- | ----------------------------------------------------------------- |
| **Serving** | vLLM, TGI, SGLang, speculative decoding                           |
| **RAG**     | Chunking strategies, hybrid search, reranking, evaluation         |
| **LLMOps**  | Prompt management, observability, cost tracking, gateway patterns |

## What's In

### 1. Trend Radar (data layer)

- Curated trend cards stored as structured JSON in `data/trends/`.
- Each card: title, summary, sources (URLs), category, date, relevance score.
- Initial batch manually curated; future versions auto-fetch.

### 2. CLI (`packages/cli`)

```
trend2trial build                             # Generate Markdown trend cards
trend2trial trends fetch [--json] [--output]  # Fetch latest trends from adapters
trend2trial recipe list                       # List available recipes
trend2trial recipe init <name> <dest>         # Initialize recipe into working directory
trend2trial recipe run <dest> [--yes]         # Run a recipe and generate REPORT.md
```

### 3. Recipes (`recipes/`)

MVP ships with 3 recipes:

| Recipe                      | Sub-domain | What you learn                                               |
| --------------------------- | ---------- | ------------------------------------------------------------ |
| `serving-latency`           | Serving    | Benchmark HTTP endpoint latency, compute p95/p99 metrics     |
| `rag-starter`               | RAG        | Build an in-memory TF-IDF search pipeline, evaluate hit rate |
| `llm-observability-starter` | LLMOps     | Instrument LLM call chains with structured JSON tracing      |

Each recipe contains: README.md, tasks.yaml, rubric.yaml, scaffold/. All recipes use only Node.js built-ins — no external dependencies.

### 4. Static Website (`apps/web`)

- Browse trend cards and recipe catalog.
- Pure static HTML/CSS — no framework, no JS required.
- Reads from `data/trends/` and `recipes/*/README.md` at build time.

## What's Out

- User accounts / auth.
- Cloud deployment of recipes.
- Topics beyond AI Infra.

## Acceptance Criteria

- [x] `pnpm install && pnpm build` succeeds on a clean checkout.
- [x] `trend2trial trends fetch` fetches trend cards from adapters.
- [x] `trend2trial recipe run` completes and produces REPORT.md.
- [x] Static site builds and displays trend cards + recipe list.
- [x] `pnpm test` passes with core module coverage (273 tests, 94% coverage).
- [x] `pnpm lint` passes with zero errors.
