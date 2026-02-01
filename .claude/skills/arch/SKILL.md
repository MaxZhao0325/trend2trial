---
name: arch
description: Produce architecture and repo structure decisions for trend2trial.
disable-model-invocation: true
---

Create:

- docs/ARCHITECTURE.md
- docs/DATA_MODEL.md

Decisions:

- Monorepo (pnpm workspace)
- packages/core: adapters, ranking, card generation
- packages/cli: trend2trial CLI
- apps/web: static site to browse trend cards
- recipes/: runnable templates
- data/: generated JSON, committed by CI

Include: data flow diagram (ASCII), module boundaries, extension points (adding a new source, adding a new recipe).
