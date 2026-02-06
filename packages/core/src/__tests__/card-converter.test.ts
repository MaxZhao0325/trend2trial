import { describe, it, expect } from "vitest";
import { convertToTrendCard, convertToTrendCards } from "../pipeline/card-converter.js";
import { validateTrendCard } from "../models/trend-card.js";
import type { TrendItem } from "../models/trend-item.js";

function makeItem(overrides: Partial<TrendItem> = {}): TrendItem {
  return {
    title: "Test Trend Item",
    url: "https://example.com/test",
    source: "test",
    tags: ["ai"],
    score: 50,
    publishedAt: "2025-06-15T12:00:00Z",
    summary: "A test trend item for conversion testing.",
    trialRecipeSuggestion: "Try this experiment",
    ...overrides,
  };
}

describe("convertToTrendCard", () => {
  it("converts TrendItem to valid TrendCard", () => {
    const card = convertToTrendCard(makeItem());
    expect(card.title).toBe("Test Trend Item");
    expect(card.summary).toBe("A test trend item for conversion testing.");
    expect(card.sources).toHaveLength(1);
    expect(card.sources[0].url).toBe("https://example.com/test");
    expect(card.sources[0].title).toBe("Test Trend Item");
    expect(card.tags).toEqual(["ai"]);
    expect(card.date).toBe("2025-06-15");
  });

  it("generates a kebab-case ID with hash suffix", () => {
    const card = convertToTrendCard(makeItem({ title: "Hello World Test" }));
    expect(card.id).toMatch(/^hello-world-test-[a-z0-9]+$/);
  });

  it("generates different IDs for different URLs", () => {
    const a = convertToTrendCard(makeItem({ url: "https://a.com/page" }));
    const b = convertToTrendCard(makeItem({ url: "https://b.com/page" }));
    expect(a.id).not.toBe(b.id);
  });

  it("passes validateTrendCard", () => {
    const card = convertToTrendCard(makeItem());
    const errors = validateTrendCard(card);
    expect(errors).toEqual([]);
  });

  it("infers serving category from keywords", () => {
    const card = convertToTrendCard(
      makeItem({ title: "vLLM serving benchmark", summary: "inference latency test" }),
    );
    expect(card.category).toBe("serving");
  });

  it("infers rag category from keywords", () => {
    const card = convertToTrendCard(makeItem({ title: "RAG vector embedding search" }));
    expect(card.category).toBe("rag");
  });

  it("infers llmops category from keywords", () => {
    const card = convertToTrendCard(makeItem({ title: "Kubernetes deploy gateway" }));
    expect(card.category).toBe("llmops");
  });

  it("defaults to serving for arxiv source when no keywords match", () => {
    const card = convertToTrendCard(
      makeItem({
        title: "Novel algorithm",
        summary: "New approach",
        tags: [],
        source: "arxiv-rss",
      }),
    );
    expect(card.category).toBe("serving");
  });

  it("defaults to llmops for non-arxiv source when no keywords match", () => {
    const card = convertToTrendCard(
      makeItem({
        title: "Novel algorithm",
        summary: "New approach",
        tags: [],
        source: "hackernews",
      }),
    );
    expect(card.category).toBe("llmops");
  });

  it("infers paper source type from arxiv URL", () => {
    const card = convertToTrendCard(makeItem({ url: "https://arxiv.org/abs/2401.00001" }));
    expect(card.sources[0].type).toBe("paper");
  });

  it("infers repo source type from github URL", () => {
    const card = convertToTrendCard(makeItem({ url: "https://github.com/vllm-project/vllm" }));
    expect(card.sources[0].type).toBe("repo");
  });

  it("infers video source type from youtube URL", () => {
    const card = convertToTrendCard(makeItem({ url: "https://youtube.com/watch?v=abc" }));
    expect(card.sources[0].type).toBe("video");
  });

  it("infers release source type from release URL", () => {
    // Note: github.com is matched before /releases, so github release URLs
    // are classified as "repo". Test with a non-github release URL.
    const card = convertToTrendCard(makeItem({ url: "https://releases.example.com/v1.0/release" }));
    expect(card.sources[0].type).toBe("release");
  });

  it("infers repo for github release URLs (github.com matched first)", () => {
    const card = convertToTrendCard(
      makeItem({ url: "https://github.com/org/repo/releases/tag/v1.0" }),
    );
    expect(card.sources[0].type).toBe("repo");
  });

  it("defaults to blog source type for other URLs", () => {
    const card = convertToTrendCard(makeItem({ url: "https://blog.example.com/post" }));
    expect(card.sources[0].type).toBe("blog");
  });

  it("clamps relevanceScore to 0-100", () => {
    const high = convertToTrendCard(makeItem({ score: 200 }));
    expect(high.relevanceScore).toBe(100);

    const low = convertToTrendCard(makeItem({ score: -10 }));
    expect(low.relevanceScore).toBe(0);
  });

  it("falls back to current date for invalid publishedAt format", () => {
    const card = convertToTrendCard(makeItem({ publishedAt: "not-a-date" }));
    // Should be a valid YYYY-MM-DD date
    expect(card.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses default summary when empty", () => {
    const card = convertToTrendCard(makeItem({ summary: "" }));
    expect(card.summary).toContain("Trending item from");
  });

  it("copies tags as a new array", () => {
    const original = makeItem({ tags: ["a", "b"] });
    const card = convertToTrendCard(original);
    expect(card.tags).toEqual(["a", "b"]);
    // Should be a different array reference
    expect(card.tags).not.toBe(original.tags);
  });
});

describe("convertToTrendCards", () => {
  it("maps array of TrendItems to TrendCards", () => {
    const items = [makeItem({ title: "Item One" }), makeItem({ title: "Item Two" })];
    const cards = convertToTrendCards(items);
    expect(cards).toHaveLength(2);
    expect(cards[0].title).toBe("Item One");
    expect(cards[1].title).toBe("Item Two");
  });

  it("returns empty array for empty input", () => {
    expect(convertToTrendCards([])).toEqual([]);
  });
});
