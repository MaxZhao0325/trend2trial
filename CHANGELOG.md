# Changelog

## v1.0.0 (2026-02-05)

### Pipeline & Trend Fetching

- feat: pluggable adapter system with `TrendAdapter` interface
- feat: RSS adapter fetching from multiple arXiv feeds with retry/timeout
- feat: HackerNews adapter fetching top stories and filtering AI-related content
- feat: TrendItem-to-TrendCard converter with validation
- feat: dedup with URL normalization + Jaccard fuzzy title matching
- feat: configurable ranker with recency, source, and keyword boost weights
- feat: versioned JSON writer with schema version tracking
- feat: shared fetch utilities with exponential backoff and concurrency limiter
- feat: `trends fetch` CLI command with `--json` and `--output` flags

### Security

- feat: command blocklist — blocks `rm -rf /`, `curl|sh`, pipe to eval/sh/bash
- feat: SHA256 checksum verification for recipe file integrity
- feat: path traversal protection in recipe fetcher
- feat: partial download cleanup on fetch failure
- feat: user consent prompt before recipe execution (`--yes` to skip)
- feat: registry schema validation against supported schema versions
- feat: recipe YAML validation for tasks.yaml and rubric.yaml

### CLI Improvements

- feat: `--version` / `-v` flag showing CLI version
- feat: `--help` / `-h` flag with full usage guide
- feat: exit codes following Unix conventions (0=success, 1=internal, 2=usage, 3=recipe-fail)
- feat: colored terminal output with picocolors
- feat: progress spinner for long-running operations
- feat: typo correction with Levenshtein distance suggestions
- feat: better error messages with formatted stderr output
- feat: `--no-fail-fast` flag to continue after step failures
- feat: input validation for recipe names and paths

### Web Improvements

- feat: search and filter functionality for trend cards
- feat: dark mode support
- feat: expandable card details
- feat: accessibility improvements (ARIA, semantic HTML, keyboard nav)
- feat: SEO meta tags

### CI/CD

- feat: GitHub Actions CI pipeline (lint, test, build on push)
- feat: npm publish workflow with release gating
- feat: scheduled trend fetching via cron
- feat: security scanning (CodeQL, dependency audit)

### Testing

- feat: comprehensive test suite — 273 tests across 24 test files
- feat: 94% code coverage on core package
- feat: coverage thresholds (statements 80%, branches 75%, functions 80%, lines 80%)
- feat: CLI integration tests (--version, --help, unknown commands, recipe list)
- feat: E2E smoke test (recipe init -> run -> REPORT.md verification)
- feat: security tests (command blocklist, consent, registry validation, YAML validation)
- feat: pipeline tests (adapters, dedup, ranker, converter, writer, integration)
- feat: fetcher security tests (path traversal, checksums, cleanup, retry)

### Docs

- docs: README overhaul with all CLI commands, contributing guide, troubleshooting
- docs: ARCHITECTURE.md rewrite with pipeline module, fetcher/resolver, security model
- docs: DATA_MODEL.md updated to match actual TypeScript types
- docs: ROADMAP.md updated with v0.5 and v1.0 completion status
- docs: MVP.md updated with accurate CLI commands and acceptance criteria

## v0.1.1 (2026-02-01)

### Fixes

- fix: republish CLI with resolved workspace dependency (`d2879f2`)

## v0.1.0 (2026-02-01)

### Features

- feat: add npm distribution with remote recipe fetching (`4d29dc9`)
- feat: publish to npm and update docs for npx usage (`6c8d050`)

### Docs

- docs: update web and README with accurate usage instructions (`da2da03`)

### Chore

- chore: add all existing project files (`15bf8a2`)
