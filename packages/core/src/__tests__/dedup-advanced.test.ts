import { describe, it, expect } from "vitest";
import { dedup } from "../pipeline/dedup.js";
import type { TrendItem } from "../models/trend-item.js";

function makeItem(overrides: Partial<TrendItem> = {}): TrendItem {
  return {
    title: "Test Item",
    url: "https://example.com/test",
    source: "test",
    tags: [],
    score: 0,
    publishedAt: "2025-01-01T00:00:00Z",
    summary: "A test item",
    trialRecipeSuggestion: "Try it",
    ...overrides,
  };
}

describe("dedup — URL normalization", () => {
  it("treats www and non-www as same URL", () => {
    const a = makeItem({ title: "Same", url: "https://www.example.com/page", source: "rss" });
    const b = makeItem({ title: "Same", url: "https://example.com/page", source: "hn" });
    const result = dedup([a, b]);
    expect(result).toHaveLength(1);
  });

  it("strips trailing slashes for comparison", () => {
    const a = makeItem({ title: "Same", url: "https://example.com/page/", source: "rss" });
    const b = makeItem({ title: "Same", url: "https://example.com/page", source: "hn" });
    const result = dedup([a, b]);
    expect(result).toHaveLength(1);
  });

  it("handles invalid URLs gracefully with fallback normalization", () => {
    const a = makeItem({ title: "A", url: "not-a-valid-url" });
    const b = makeItem({ title: "B", url: "https://example.com" });
    // Should not throw
    const result = dedup([a, b]);
    expect(result).toHaveLength(2);
  });
});

describe("dedup — cross-source dedup", () => {
  it("keeps higher-scored item when same URL from different sources", () => {
    // Titles must differ to bypass Pass 1 exact dedup (title+URL key)
    const rss = makeItem({
      title: "Article: LLM Serving",
      url: "https://example.com/article",
      source: "rss",
      score: 30,
    });
    const hn = makeItem({
      title: "LLM Serving Article Discussion",
      url: "https://example.com/article",
      source: "hackernews",
      score: 80,
    });
    const result = dedup([rss, hn]);
    // Cross-source dedup by normalized URL: keeps higher scored
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("hackernews");
    expect(result[0].score).toBe(80);
  });

  it("keeps both items when same URL from same source but different titles", () => {
    const a = makeItem({
      title: "Title A",
      url: "https://example.com/page",
      source: "rss",
    });
    const b = makeItem({
      title: "Title B",
      url: "https://example.com/page",
      source: "rss",
    });
    const result = dedup([a, b]);
    expect(result).toHaveLength(2);
  });
});

describe("dedup — fuzzy title matching", () => {
  it("removes near-duplicate titles on same domain (Dice >= 0.85)", () => {
    const a = makeItem({
      title: "Efficient LLM Serving with Speculative Decoding",
      url: "https://arxiv.org/abs/2401.00001",
      source: "rss",
      score: 50,
    });
    const b = makeItem({
      title: "Efficient LLM Serving with Speculative Decoding Techniques",
      url: "https://arxiv.org/abs/2401.00002",
      source: "rss",
      score: 60,
    });
    const result = dedup([a, b]);
    expect(result).toHaveLength(1);
    // Higher score should be kept
    expect(result[0].score).toBe(60);
  });

  it("keeps titles that are different enough on same domain (Dice < 0.85)", () => {
    const a = makeItem({
      title: "LLM Serving Optimization",
      url: "https://arxiv.org/abs/2401.00001",
      source: "rss",
    });
    const b = makeItem({
      title: "RAG Pipeline Evaluation Metrics",
      url: "https://arxiv.org/abs/2401.00099",
      source: "rss",
    });
    const result = dedup([a, b]);
    expect(result).toHaveLength(2);
  });

  it("keeps similar titles from different domains", () => {
    const a = makeItem({
      title: "Efficient LLM Serving Guide",
      url: "https://arxiv.org/abs/2401.00001",
    });
    const b = makeItem({
      title: "Efficient LLM Serving Guide",
      url: "https://blog.example.com/llm-serving",
    });
    const result = dedup([a, b]);
    // Different domains — fuzzy matching does not apply, but exact title+url dedup also
    // doesn't match since URLs are different. They should both be kept.
    expect(result).toHaveLength(2);
  });

  it("fuzzy match keeps the higher-scored item", () => {
    const a = makeItem({
      title: "Vector Database Comparison for RAG Applications",
      url: "https://example.com/article-1",
      score: 90,
    });
    const b = makeItem({
      title: "Vector Database Comparison for RAG Application",
      url: "https://example.com/article-2",
      score: 40,
    });
    const result = dedup([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(90);
  });
});

describe("dedup — large input", () => {
  it("handles 100+ items without hanging", () => {
    const items: TrendItem[] = [];
    for (let i = 0; i < 150; i++) {
      items.push(
        makeItem({
          title: `Unique Item Number ${i}`,
          url: `https://example.com/item-${i}`,
          source: i % 2 === 0 ? "rss" : "hackernews",
          score: i,
        }),
      );
    }
    const start = Date.now();
    const result = dedup(items);
    const elapsed = Date.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(150);
    // Should complete in well under a second
    expect(elapsed).toBeLessThan(5000);
  });
});
