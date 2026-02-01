import { writeFile } from "node:fs/promises";

const URL = "http://localhost:9876";
const N = 50;

async function sendRequest() {
  const start = performance.now();
  const res = await fetch(URL);
  const elapsed = performance.now() - start;
  return { status: res.status, elapsed };
}

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function main() {
  // Wait for server to be ready
  for (let i = 0; i < 10; i++) {
    try {
      await fetch(URL);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`Sending ${N} requests to ${URL}...`);
  const start = performance.now();
  const results = [];

  for (let i = 0; i < N; i++) {
    results.push(await sendRequest());
  }

  const totalMs = performance.now() - start;
  const latencies = results.map((r) => r.elapsed).sort((a, b) => a - b);
  const errors = results.filter((r) => r.status !== 200).length;

  const metrics = {
    p95_latency_ms: Math.round(percentile(latencies, 95)),
    p99_latency_ms: Math.round(percentile(latencies, 99)),
    throughput_rps: Number((N / (totalMs / 1000)).toFixed(2)),
    error_rate: Number(((errors / N) * 100).toFixed(2)),
    total_requests: N,
    total_time_ms: Math.round(totalMs),
  };

  console.log("Results:", JSON.stringify(metrics, null, 2));
  await writeFile("metrics.json", JSON.stringify(metrics, null, 2));
  console.log("Wrote metrics.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
