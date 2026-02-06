# Trend-to-Trial — Roadmap

## v0 — MVP

**Focus:** AI Infra (Serving / RAG / LLMOps)

- [x] Project scaffolding: monorepo, lint, test, build pipeline
- [x] `packages/core`: trend card model, recipe runner, report generator
- [x] `packages/cli`: basic commands (build, recipe list/init/run)
- [x] `recipes/`: 3 starter recipes (serving-latency, rag-starter, llm-observability-starter)
- [x] `apps/web`: static site displaying trends + recipe catalog
- [x] `data/trends/`: 5 manually curated initial trend cards
- [x] Documentation: README, CLAUDE.md, per-recipe READMEs

## v0.5 — npm Distribution & Remote Recipe Fetching

**Focus:** Zero-clone user experience

- [x] Publish CLI to npm as `trend2trial` — users run via `npx trend2trial`
- [x] `recipes/registry.json`: recipe metadata registry (version, file list, SHA)
- [x] `RecipeFetcher` module in core: download recipes from GitHub at runtime
- [x] Local cache at `~/.trend2trial/cache/` with version-based invalidation
- [x] CLI `recipe init/run` fetches from remote, falls back to local
- [x] Users no longer need to clone the repo to use recipes

## v1 — Pipeline, Security & CI

**Focus:** Automated trend fetching, hardened security, CI/CD

- [x] Auto-fetch trends from sources (arXiv RSS, HackerNews API)
- [x] Trend ranking algorithm (recency x source x keyword boost)
- [x] Pluggable adapter system for trend sources
- [x] TrendItem-to-TrendCard converter with validation
- [x] Dedup with URL normalization + fuzzy title matching
- [x] Versioned JSON writer with schema tracking
- [x] `trends fetch` CLI command with `--json` and `--output` flags
- [x] Command blocklist (rm -rf /, curl|sh, pipe to eval)
- [x] SHA256 checksum verification for recipe files
- [x] Path traversal protection in fetcher
- [x] Partial download cleanup on failure
- [x] User consent prompt before recipe execution
- [x] Registry schema validation
- [x] Recipe YAML schema validation (tasks.yaml + rubric.yaml)
- [x] GitHub Actions CI: lint, test, build on push
- [x] Publish workflow + release gating
- [x] Scheduled trend fetching + security scanning
- [x] CLI improvements: --version, exit codes, colored output, progress spinner, error suggestions
- [x] Web improvements: search/filter, dark mode, expandable cards, accessibility, SEO
- [x] Comprehensive test suite (273 tests, 94% coverage)
- [ ] 10+ recipes covering deeper topics (quantization, LoRA serving, vector DB comparison)
- [ ] Recipe difficulty levels (beginner / intermediate / advanced)
- [ ] Weekly digest generation (markdown + optional email)

## v2 — Beyond Infra

**Focus:** Expand to adjacent AI/ML domains

- [ ] New topic areas: ML Engineering, Data Engineering, Robotics/Embodied AI
- [ ] Community-contributed recipes (PR template + validation)
- [ ] Interactive recipe mode (step-by-step guided execution)
- [ ] Recipe dependency graph (recipe B builds on recipe A)
- [ ] Comparison reports (run recipe across configs, diff results)
- [ ] Plugin system for custom trend sources
