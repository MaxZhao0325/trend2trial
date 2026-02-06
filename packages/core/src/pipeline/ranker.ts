import type { TrendItem } from "../models/trend-item.js";

const DEFAULT_INFRA_KEYWORDS = [
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

export interface RankConfig {
  freshnessWeight: number;
  popularityWeight: number;
  infraWeight: number;
  roiWeight: number;
  halfLifeDays: number;
  infraKeywords: string[];
}

export const DEFAULT_RANK_CONFIG: RankConfig = {
  freshnessWeight: 25,
  popularityWeight: 25,
  infraWeight: 30,
  roiWeight: 20,
  halfLifeDays: 7,
  infraKeywords: DEFAULT_INFRA_KEYWORDS,
};

function freshnessScore(publishedAt: string, now: Date, config: RankConfig): number {
  const published = new Date(publishedAt);
  const diffMs = now.getTime() - published.getTime();
  if (diffMs < 0) return config.freshnessWeight;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return config.freshnessWeight * Math.pow(0.5, diffDays / config.halfLifeDays);
}

function popularityScore(rawScore: number, maxScore: number, config: RankConfig): number {
  if (maxScore <= 0) return 0;
  return config.popularityWeight * Math.min(rawScore / maxScore, 1);
}

function infraRelevanceScore(item: TrendItem, config: RankConfig): number {
  const text = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
  let matches = 0;
  for (const kw of config.infraKeywords) {
    if (text.includes(kw)) matches++;
  }
  const ratio = Math.min(matches / 5, 1);
  return config.infraWeight * ratio;
}

function learningRoiScore(item: TrendItem, config: RankConfig): number {
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

  return Math.min(score, config.roiWeight);
}

export function rank(items: TrendItem[], config?: Partial<RankConfig>): TrendItem[] {
  if (items.length === 0) return [];

  const cfg: RankConfig = { ...DEFAULT_RANK_CONFIG, ...config };
  const now = new Date();
  const maxRawScore = Math.max(...items.map((i) => i.score), 1);

  const scored = items.map((item) => {
    const freshness = freshnessScore(item.publishedAt, now, cfg);
    const popularity = popularityScore(item.score, maxRawScore, cfg);
    const infra = infraRelevanceScore(item, cfg);
    const roi = learningRoiScore(item, cfg);
    const total = Math.round(freshness + popularity + infra + roi);

    return { ...item, score: Math.min(total, 100) };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}
