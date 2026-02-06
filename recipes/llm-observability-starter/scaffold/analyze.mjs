import { readFile, writeFile } from "node:fs/promises";

const REQUIRED_FIELDS = [
  "trace_id",
  "span_id",
  "name",
  "start_time",
  "end_time",
  "duration_ms",
  "status",
];

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function main() {
  const raw = await readFile("traces.json", "utf-8");
  const spans = JSON.parse(raw);

  // Count unique traces
  const traceIds = new Set(spans.map((s) => s.trace_id));
  const traceCount = traceIds.size;

  // Check span field coverage
  let completeSpans = 0;
  for (const span of spans) {
    const hasAll = REQUIRED_FIELDS.every((f) => span[f] !== null && span[f] !== undefined);
    if (hasAll) completeSpans++;
  }
  const spanCoveragePct = Number(((completeSpans / spans.length) * 100).toFixed(1));

  // Count error captures
  const errorCaptures = spans.filter((s) => s.status === "error").length;

  // Compute p95 duration
  const durations = spans
    .map((s) => s.duration_ms)
    .filter((d) => d !== null)
    .sort((a, b) => a - b);
  const p95Duration = durations.length > 0 ? percentile(durations, 95) : 0;

  const metrics = {
    trace_count: traceCount,
    span_coverage_pct: spanCoveragePct,
    error_capture_count: errorCaptures,
    p95_duration_ms: Math.round(p95Duration),
  };

  console.log("Analysis results:", JSON.stringify(metrics, null, 2));
  await writeFile("metrics.json", JSON.stringify(metrics, null, 2));
  console.log("Wrote metrics.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
