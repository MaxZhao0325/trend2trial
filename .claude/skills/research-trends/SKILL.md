---
name: research-trends
description: Research weekly trends for a given AI Infra topic and produce ranked signals + sources.
context: fork
---

Research $ARGUMENTS for the last 7-30 days.
Output:

- docs/trends/$ARGUMENTS.md

Method:

1. Use WebSearch to identify 5-10 high-signal sources (papers, repos, releases, blog posts).
2. Cluster duplicates; extract what changed and why it matters.
3. Produce a ranked list with rationale: novelty, adoption, infra relevance, learning ROI.
4. For top 3 items, propose a 2-6 hour "trial recipe" idea with acceptance criteria.
5. Write the result to docs/trends/$ARGUMENTS.md.
