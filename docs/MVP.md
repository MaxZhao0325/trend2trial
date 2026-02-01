# Trend-to-Trial — MVP Scope

## Focus Area

**AI Infra** — specifically three sub-domains:

| Sub-domain | Example trends |
|------------|---------------|
| **Serving** | vLLM, TGI, SGLang, speculative decoding |
| **RAG** | Chunking strategies, hybrid search, reranking, evaluation |
| **LLMOps** | Prompt management, observability, cost tracking, gateway patterns |

## What's In

### 1. Trend Radar (data layer)

- Curated trend cards stored as structured JSON in `data/trends/`.
- Each card: title, summary, sources (URLs), category, date, relevance score.
- Initial batch manually curated; future versions auto-fetch.

### 2. CLI (`packages/cli`)

```
trend2trial trends                  # List current trends
trend2trial trends --topic serving  # Filter by sub-domain
trend2trial recipe list             # List available recipes
trend2trial recipe run <name>       # Run a recipe
trend2trial recipe report <name>    # Generate REPORT.md
```

### 3. Recipes (`recipes/`)

MVP ships with 3 recipes:

| Recipe | Sub-domain | What you learn |
|--------|-----------|----------------|
| `serving-latency` | Serving | Benchmark HTTP endpoint latency, compute p95/p99 metrics |
| `rag-starter` | RAG | Build an in-memory TF-IDF search pipeline, evaluate hit rate |
| `llm-observability-starter` | LLMOps | Instrument LLM call chains with structured JSON tracing |

Each recipe contains: README.md, tasks.yaml, rubric.yaml, scaffold/. All recipes use only Node.js built-ins — no external dependencies.

### 4. Static Website (`apps/web`)

- Browse trend cards and recipe catalog.
- Pure static HTML/CSS — no framework, no JS required.
- Reads from `data/trends/` and `recipes/*/README.md` at build time.

## What's Out

- Auto-fetching trends (manual curation for MVP).
- User accounts / auth.
- Cloud deployment of recipes.
- Topics beyond AI Infra.
- CI/CD pipeline (manual release via `/release` skill).

## Acceptance Criteria

- [ ] `pnpm install && pnpm build` succeeds on a clean checkout.
- [ ] `trend2trial trends` prints >= 5 trend cards.
- [ ] `trend2trial recipe run serving-latency` completes and produces REPORT.md.
- [ ] Static site builds and displays trend cards + recipe list.
- [ ] `pnpm test` passes with core module coverage.
- [ ] `pnpm lint` passes with zero errors.
