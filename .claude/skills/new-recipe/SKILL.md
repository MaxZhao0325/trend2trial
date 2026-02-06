---
name: new-recipe
description: Scaffold a new runnable trial recipe with a REPORT.md rubric.
---

Create a new directory under recipes/$ARGUMENTS/ with:

- README.md (what you learn, prerequisites, estimated time)
- tasks.yaml (steps: setup, run, eval, report — each with a shell command)
- rubric.yaml (acceptance criteria + metrics to collect)
- scaffold/ (minimal runnable code to get started)

REPORT.md contract (per CLAUDE.md):
Every recipe run must produce a REPORT.md containing:
- Experiment purpose
- Environment & parameters
- Result summary
- Reproducible command

After scaffolding:
1. Update `recipes/registry.json` — add a new entry with name, title, category, estimated_hours, version, and files (use ChecksummedFile with SHA256 hashes for integrity).
2. Update the recipe list in docs/MVP.md and README.md.
