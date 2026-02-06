import type { TrendItem } from "../../models/trend-item.js";
import type { TrendAdapter, AdapterOptions } from "./types.js";
import { fetchWithRetry, runWithConcurrency } from "../fetch-utils.js";

const HN_TOP_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item";
const DEFAULT_MAX_STORIES = 30;
const HN_CONCURRENCY = 5;

const AI_KEYWORDS = [
  "ai",
  "llm",
  "gpt",
  "ml",
  "machine learning",
  "deep learning",
  "neural",
  "transformer",
  "diffusion",
  "inference",
  "gpu",
  "cuda",
  "vllm",
  "rag",
  "vector",
  "embedding",
  "serving",
  "deploy",
  "latency",
  "throughput",
  "fine-tun",
  "lora",
  "quantiz",
  "ggml",
  "gguf",
  "ollama",
  "openai",
  "anthropic",
  "claude",
  "langchain",
  "llama",
  "mistral",
];

interface HnStory {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  time?: number;
  type?: string;
}

function matchesAiKeywords(title: string): boolean {
  const lower = title.toLowerCase();
  return AI_KEYWORDS.some((kw) => lower.includes(kw));
}

async function fetchStoryIds(options?: AdapterOptions): Promise<number[]> {
  const response = await fetchWithRetry(HN_TOP_URL, {
    timeout: options?.timeout,
    signal: options?.signal,
  });
  if (!response.ok) {
    throw new Error(`HN top stories fetch failed: ${response.status}`);
  }
  const ids = (await response.json()) as number[];
  const max = options?.maxItems ?? DEFAULT_MAX_STORIES;
  return ids.slice(0, max);
}

async function fetchStory(id: number, options?: AdapterOptions): Promise<HnStory | null> {
  try {
    const response = await fetchWithRetry(`${HN_ITEM_URL}/${id}.json`, {
      timeout: options?.timeout,
      signal: options?.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as HnStory;
  } catch {
    return null;
  }
}

function toTrendItem(story: HnStory): TrendItem | null {
  if (!story.title || !story.url) return null;

  const publishedAt = story.time
    ? new Date(story.time * 1000).toISOString()
    : new Date().toISOString();

  return {
    title: story.title,
    url: story.url,
    source: "hackernews",
    tags: ["hackernews"],
    score: story.score ?? 0,
    publishedAt,
    summary: `Hacker News discussion with ${story.score ?? 0} points.`,
    trialRecipeSuggestion: `Explore and evaluate "${story.title.slice(0, 60)}".`,
  };
}

export async function fetchHackerNews(options?: AdapterOptions): Promise<TrendItem[]> {
  const ids = await fetchStoryIds(options);
  const storyTasks = ids.map((id) => () => fetchStory(id, options));
  const stories = await runWithConcurrency(storyTasks, HN_CONCURRENCY);
  return stories
    .filter((s): s is HnStory => s !== null)
    .filter((s) => s.title !== undefined && matchesAiKeywords(s.title))
    .map(toTrendItem)
    .filter((item): item is TrendItem => item !== null);
}

export const hackernewsAdapter: TrendAdapter = {
  name: "hackernews",
  enabled: true,
  async fetch(options?: AdapterOptions): Promise<TrendItem[]> {
    return fetchHackerNews(options);
  },
};
