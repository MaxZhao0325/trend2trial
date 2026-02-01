import type { TrendItem } from "../models/trend-item.js";

const INFRA_KEYWORDS = [
  "vllm",
  "rag",
  "vector",
  "serving",
  "gpu",
  "inference",
  "deploy",
  "latency",
  "throughput",
  "kubernetes",
  "k8s",
  "docker",
  "triton",
  "tensorrt",
  "onnx",
  "quantiz",
  "fine-tun",
  "lora",
  "batch",
  "pipeline",
  "embedding",
  "index",
  "cache",
  "shard",
  "parallel",
  "distributed",
  "scaling",
  "llmops",
  "mlops",
  "ggml",
  "gguf",
  "ollama",
  "openai",
  "api",
];

const HALF_LIFE_DAYS = 7;

function freshnessScore(publishedAt: string, now: Date): number {
  const published = new Date(publishedAt);
  const diffMs = now.getTime() - published.getTime();
  if (diffMs < 0) return 25;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return 25 * Math.pow(0.5, diffDays / HALF_LIFE_DAYS);
}

function popularityScore(rawScore: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return 25 * Math.min(rawScore / maxScore, 1);
}

function infraRelevanceScore(item: TrendItem): number {
  const text = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
  let matches = 0;
  for (const kw of INFRA_KEYWORDS) {
    if (text.includes(kw)) matches++;
  }
  const ratio = Math.min(matches / 5, 1);
  return 30 * ratio;
}

function learningRoiScore(item: TrendItem): number {
  let score = 0;
  const text = `${item.title} ${item.summary} ${item.url}`.toLowerCase();

  if (text.includes("github.com") || text.includes("repo") || text.includes("code")) {
    score += 8;
  }
  if (
    item.trialRecipeSuggestion.length > 20 ||
    text.includes("tutorial") ||
    text.includes("guide") ||
    text.includes("how to")
  ) {
    score += 6;
  }
  if (item.summary.length > 100) {
    score += 6;
  }

  return Math.min(score, 20);
}

export function rank(items: TrendItem[]): TrendItem[] {
  if (items.length === 0) return [];

  const now = new Date();
  const maxRawScore = Math.max(...items.map((i) => i.score), 1);

  const scored = items.map((item) => {
    const freshness = freshnessScore(item.publishedAt, now);
    const popularity = popularityScore(item.score, maxRawScore);
    const infra = infraRelevanceScore(item);
    const roi = learningRoiScore(item);
    const total = Math.round(freshness + popularity + infra + roi);

    return { ...item, score: Math.min(total, 100) };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}
