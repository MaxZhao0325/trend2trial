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

- [ ] Publish CLI to npm as `trend2trial` — users run via `npx trend2trial`
- [ ] `recipes/registry.json`: recipe metadata registry (version, file list, SHA)
- [ ] `RecipeFetcher` module in core: download recipes from GitHub at runtime
- [ ] Local cache at `~/.trend2trial/cache/` with version-based invalidation
- [ ] CLI `recipe init/run` fetches from remote, falls back to local
- [ ] Users no longer need to clone the repo to use recipes

## v1 — More Sources & Recipes

**Focus:** Automation & breadth within AI Infra

- [ ] Auto-fetch trends from sources (arXiv, GitHub trending, HN, tech blogs)
- [ ] Trend ranking algorithm (novelty × adoption × learning ROI)
- [ ] 10+ recipes covering deeper topics (quantization, LoRA serving, vector DB comparison)
- [ ] Recipe difficulty levels (beginner / intermediate / advanced)
- [ ] Weekly digest generation (markdown + optional email)
- [ ] GitHub Actions CI: lint, test, build, deploy site on push

## v2 — Beyond Infra

**Focus:** Expand to adjacent AI/ML domains

- [ ] New topic areas: ML Engineering, Data Engineering, Robotics/Embodied AI
- [ ] Community-contributed recipes (PR template + validation)
- [ ] Interactive recipe mode (step-by-step guided execution)
- [ ] Recipe dependency graph (recipe B builds on recipe A)
- [ ] Comparison reports (run recipe across configs, diff results)
- [ ] Plugin system for custom trend sources
