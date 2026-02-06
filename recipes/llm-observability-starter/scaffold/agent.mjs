import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

// Mock LLM agent that produces structured traces

function createSpan(traceId, name, parentSpanId = null) {
  return {
    trace_id: traceId,
    span_id: randomUUID(),
    parent_span_id: parentSpanId,
    name,
    start_time: new Date().toISOString(),
    end_time: null,
    duration_ms: null,
    status: "ok",
    error: null,
    attributes: {},
  };
}

function finishSpan(span) {
  span.end_time = new Date().toISOString();
  span.duration_ms = new Date(span.end_time).getTime() - new Date(span.start_time).getTime();
}

async function mockLlmCall(prompt, delayMs) {
  await new Promise((r) => setTimeout(r, delayMs));
  return `Response to: ${prompt.slice(0, 30)}...`;
}

async function runTrace(traceId, query, shouldError = false) {
  const spans = [];

  // Root span: user query
  const root = createSpan(traceId, "user_query");
  root.attributes = { query };

  // Child span: retrieval
  const retrieval = createSpan(traceId, "retrieval", root.span_id);
  retrieval.attributes = { source: "vector_db", top_k: 5 };
  await new Promise((r) => setTimeout(r, Math.random() * 20 + 5));
  retrieval.attributes.results_count = 3;
  finishSpan(retrieval);
  spans.push(retrieval);

  // Child span: LLM call
  const llmSpan = createSpan(traceId, "llm_call", root.span_id);
  llmSpan.attributes = { model: "mock-gpt-4", temperature: 0.7 };

  if (shouldError) {
    await new Promise((r) => setTimeout(r, Math.random() * 10 + 5));
    llmSpan.status = "error";
    llmSpan.error = "Rate limit exceeded";
    finishSpan(llmSpan);
  } else {
    const response = await mockLlmCall(query, Math.random() * 50 + 10);
    llmSpan.attributes.response_length = response.length;
    llmSpan.attributes.tokens_used = Math.floor(Math.random() * 200) + 50;
    finishSpan(llmSpan);
  }
  spans.push(llmSpan);

  // Child span: post-processing
  const postProcess = createSpan(traceId, "post_process", root.span_id);
  await new Promise((r) => setTimeout(r, Math.random() * 5 + 1));
  postProcess.attributes = { format: "markdown" };
  finishSpan(postProcess);
  spans.push(postProcess);

  finishSpan(root);
  spans.push(root);

  return spans;
}

async function main() {
  const traces = [];

  // Trace 1: normal query
  const t1 = randomUUID();
  console.log(`Running trace ${t1} (normal)...`);
  traces.push(...(await runTrace(t1, "How does vLLM work?")));

  // Trace 2: another normal query
  const t2 = randomUUID();
  console.log(`Running trace ${t2} (normal)...`);
  traces.push(...(await runTrace(t2, "Explain retrieval augmented generation")));

  // Trace 3: error case
  const t3 = randomUUID();
  console.log(`Running trace ${t3} (with error)...`);
  traces.push(...(await runTrace(t3, "What is LoRA?", true)));

  // Trace 4: normal query
  const t4 = randomUUID();
  console.log(`Running trace ${t4} (normal)...`);
  traces.push(...(await runTrace(t4, "Kubernetes for ML workloads")));

  await writeFile("traces.json", JSON.stringify(traces, null, 2));
  console.log(`Wrote ${traces.length} spans across 4 traces to traces.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
