import type { TrendItem } from "../../models/trend-item.js";

const HN_TOP_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item";
const MAX_STORIES = 30;

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

async function fetchStoryIds(): Promise<number[]> {
  const response = await fetch(HN_TOP_URL);
  if (!response.ok) {
    throw new Error(`HN top stories fetch failed: ${response.status}`);
  }
  const ids = (await response.json()) as number[];
  return ids.slice(0, MAX_STORIES);
}

async function fetchStory(id: number): Promise<HnStory | null> {
  const response = await fetch(`${HN_ITEM_URL}/${id}.json`);
  if (!response.ok) return null;
  return (await response.json()) as HnStory;
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

export async function fetchHackerNews(): Promise<TrendItem[]> {
  const ids = await fetchStoryIds();
  const stories = await Promise.all(ids.map(fetchStory));
  return stories
    .filter((s): s is HnStory => s !== null)
    .filter((s) => s.title !== undefined && matchesAiKeywords(s.title))
    .map(toTrendItem)
    .filter((item): item is TrendItem => item !== null);
}
