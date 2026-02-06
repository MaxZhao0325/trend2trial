# Trend-to-Trial — Product Requirements Document

## Problem

Software engineers interested in transitioning to AI/ML roles face two compounding barriers:

1. **Information overload** — The AI landscape moves fast; it's hard to know which trends actually matter and which are noise.
2. **High ramp-up cost** — Building a meaningful project to explore a new area (e.g., vLLM serving, RAG pipelines) takes days of setup before any learning happens.

There is no single tool that curates actionable trends **and** pairs each with a runnable, low-cost trial project.

## Target Users

| Persona                  | Description                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Career-switcher**      | Full-stack / backend engineer (2-8 YoE) exploring AI roles; needs portfolio projects and domain knowledge |
| **Curious generalist**   | Engineer who wants to stay current on AI Infra without deep-diving every paper                            |
| **Hiring-prep engineer** | Someone preparing for AI Infra interviews who needs hands-on experience fast                              |

## Non-Goals

- Not a course platform or MOOC replacement.
- Not a model training framework.
- Not a managed cloud service — everything runs locally or on the user's own infra.
- No user accounts, databases, or payment systems in MVP.

## User Stories

1. **As a** career-switcher, **I want to** see a ranked list of this month's top AI Infra trends **so that** I know where to focus my limited study time.
2. **As a** career-switcher, **I want to** run a single CLI command (e.g., `npx trend2trial recipe run serving-latency`) to scaffold and execute a trial project for a trend **so that** I get hands-on experience without cloning a repo or managing dependencies.
3. **As a** curious generalist, **I want to** browse trend summaries on a static website **so that** I can stay informed without installing anything.
4. **As a** hiring-prep engineer, **I want to** generate a REPORT.md after completing a trial **so that** I have a tangible artifact for my portfolio.

## Success Metrics

| Metric                 | Target (MVP)                              |
| ---------------------- | ----------------------------------------- |
| Trends covered         | >= 5 curated trends in AI Infra           |
| Recipes available      | >= 3 runnable recipes                     |
| Recipe completion time | < 3 hours per recipe on a standard laptop |
| CLI setup-to-first-run | < 2 minutes (single npx command)          |
| REPORT.md generated    | 100% of recipe runs produce a report      |
