# Serving Latency Benchmark

Measure HTTP serving latency with a mock server that introduces random delays.

## What You'll Learn

- How to benchmark HTTP endpoint latency
- How to compute p95/p99 percentile metrics
- How to measure throughput (requests per second)

## Prerequisites

- Node.js >= 20

## Quick Start

```bash
trend2trial recipe init serving-latency ./my-bench
trend2trial recipe run ./my-bench
cat ./my-bench/REPORT.md
```
