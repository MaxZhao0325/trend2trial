import type { TrendItem } from "../models/trend-item.js";
import type { TrendCard, Category, SourceType, Source } from "../models/trend-card.js";

const SERVING_KEYWORDS = [
  "serving", "inference", "latency", "throughput", "vllm", "triton",
  "tensorrt", "onnx", "gpu", "batch", "sglang", "speculative",
  "kv-cache", "attention", "cuda",
];

const RAG_KEYWORDS = [
  "rag", "vector", "embedding", "retrieval", "chunking", "index",
  "search", "rerank", "pinecone", "weaviate", "chroma", "faiss",
];

const LLMOPS_KEYWORDS = [
  "llmops", "mlops", "deploy", "kubernetes", "k8s", "docker",
  "gateway", "proxy", "monitor", "observ", "cost", "rate-limit",
  "fine-tun", "lora", "quantiz", "ggml", "gguf",
];

function inferCategory(item: TrendItem): Category {
  const text = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();

  let servingScore = 0;
  let ragScore = 0;
  let llmopsScore = 0;

  for (const kw of SERVING_KEYWORDS) {
    if (text.includes(kw)) servingScore++;
  }
  for (const kw of RAG_KEYWORDS) {
    if (text.includes(kw)) ragScore++;
  }
  for (const kw of LLMOPS_KEYWORDS) {
    if (text.includes(kw)) llmopsScore++;
  }

  if (ragScore >= servingScore && ragScore >= llmopsScore && ragScore > 0) return "rag";
  if (llmopsScore >= servingScore && llmopsScore > 0) return "llmops";
  if (servingScore > 0) return "serving";

  // Default based on source
  if (item.source.includes("arxiv")) return "serving";
  return "llmops";
}

function inferSourceType(url: string): SourceType {
  const lower = url.toLowerCase();
  if (lower.includes("arxiv.org")) return "paper";
  if (lower.includes("github.com")) return "repo";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "video";
  if (lower.includes("/releases") || lower.includes("/release")) return "release";
  return "blog";
}

function generateId(url: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50)
    .replace(/-+$/, "");

  // Simple hash from URL for uniqueness
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  const shortHash = Math.abs(hash).toString(36).slice(0, 6);

  return `${slug}-${shortHash}`;
}

export function convertToTrendCard(item: TrendItem): TrendCard {
  const source: Source = {
    title: item.title,
    url: item.url,
    type: inferSourceType(item.url),
  };

  const dateStr = item.publishedAt.slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : new Date().toISOString().slice(0, 10);

  return {
    id: generateId(item.url, item.title),
    title: item.title,
    summary: item.summary || `Trending item from ${item.source}.`,
    category: inferCategory(item),
    sources: [source],
    date,
    relevanceScore: Math.max(0, Math.min(item.score, 100)),
    tags: [...item.tags],
  };
}

export function convertToTrendCards(items: TrendItem[]): TrendCard[] {
  return items.map(convertToTrendCard);
}
