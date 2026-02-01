import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Simple TF-IDF implementation using only Node.js built-ins

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function termFrequency(tokens) {
  const tf = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  const total = tokens.length;
  for (const key of Object.keys(tf)) {
    tf[key] /= total;
  }
  return tf;
}

function buildIndex(docs) {
  const docTokens = docs.map((doc) => ({
    id: doc.id,
    tokens: tokenize(`${doc.title} ${doc.content}`),
  }));

  // Compute IDF
  const df = {};
  for (const { tokens } of docTokens) {
    const unique = new Set(tokens);
    for (const token of unique) {
      df[token] = (df[token] || 0) + 1;
    }
  }
  const N = docs.length;
  const idf = {};
  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log(N / count) + 1;
  }

  // Compute TF-IDF vectors
  const vectors = docTokens.map(({ id, tokens }) => {
    const tf = termFrequency(tokens);
    const vec = {};
    for (const [term, freq] of Object.entries(tf)) {
      vec[term] = freq * (idf[term] || 0);
    }
    return { id, vec };
  });

  return { vectors, idf };
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of allKeys) {
    const va = a[key] || 0;
    const vb = b[key] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function search(queryText, index, topK = 5) {
  const tokens = tokenize(queryText);
  const tf = termFrequency(tokens);
  const queryVec = {};
  for (const [term, freq] of Object.entries(tf)) {
    queryVec[term] = freq * (index.idf[term] || 0);
  }

  const scored = index.vectors.map((doc) => ({
    id: doc.id,
    score: cosineSimilarity(queryVec, doc.vec),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

async function main() {
  const command = process.argv[2];

  const docsPath = resolve(__dirname, "docs.json");
  const docsRaw = await readFile(docsPath, "utf-8");
  const docs = JSON.parse(docsRaw);

  if (command === "build") {
    console.log(`Indexing ${docs.length} documents...`);
    const index = buildIndex(docs);
    console.log(`Index built with ${Object.keys(index.idf).length} unique terms`);
    console.log("Index build complete.");
    return;
  }

  if (command === "query") {
    const queriesPath = resolve(__dirname, "queries.json");
    const queriesRaw = await readFile(queriesPath, "utf-8");
    const queries = JSON.parse(queriesRaw);

    const index = buildIndex(docs);
    let hits = 0;
    let totalLatency = 0;
    let failedQueries = 0;

    for (const q of queries) {
      try {
        const start = performance.now();
        const results = search(q.query, index, 5);
        const elapsed = performance.now() - start;
        totalLatency += elapsed;

        const hitIds = results.map((r) => r.id);
        const isHit = hitIds.includes(q.expected_doc_id);
        if (isHit) hits++;

        console.log(
          `  ${isHit ? "HIT" : "MISS"} | "${q.query}" → [${hitIds.join(", ")}]`,
        );
      } catch (err) {
        failedQueries++;
        console.error(`  FAIL | "${q.query}": ${err.message}`);
      }
    }

    const metrics = {
      hit_rate_at_5: Number((hits / queries.length).toFixed(3)),
      avg_latency_ms: Number((totalLatency / queries.length).toFixed(2)),
      index_size_docs: docs.length,
      failed_queries: failedQueries,
    };

    console.log("\nResults:", JSON.stringify(metrics, null, 2));
    await writeFile("metrics.json", JSON.stringify(metrics, null, 2));
    console.log("Wrote metrics.json");
    return;
  }

  console.error('Usage: node index.mjs <build|query>');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
