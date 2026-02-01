import { describe, it, expect } from "vitest";
import { rank } from "../pipeline/ranker.js";
import type { TrendItem } from "../models/trend-item.js";

function makeItem(overrides: Partial<TrendItem> = {}): TrendItem {
  return {
    title: "Test Item",
    url: "https://example.com/test",
    source: "test",
    tags: [],
    score: 0,
    publishedAt: new Date().toISOString(),
    summary: "A test item",
    trialRecipeSuggestion: "Try it",
    ...overrides,
  };
}

describe("rank", () => {
  it("returns empty array for empty input", () => {
    expect(rank([])).toEqual([]);
  });

  it("returns items sorted by score descending", () => {
    const items = [
      makeItem({ title: "Low", tags: [] }),
      makeItem({
        title: "High vllm serving inference",
        tags: ["serving", "gpu", "inference"],
        summary: "A detailed guide about vllm serving with gpu inference and deployment strategies",
        score: 100,
      }),
    ];
    const result = rank(items);
    expect(result[0].title).toContain("High");
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it("gives higher score to items with infra keywords", () => {
    const plain = makeItem({ title: "Random news", summary: "Some random news article" });
    const infra = makeItem({
      title: "vllm gpu serving",
      summary: "Inference latency throughput optimization",
      tags: ["serving"],
    });
    const result = rank([plain, infra]);
    expect(result[0].title).toBe("vllm gpu serving");
  });

  it("applies freshness decay for older items", () => {
    const now = new Date();
    const fresh = makeItem({
      title: "Fresh item",
      publishedAt: now.toISOString(),
    });
    const old = makeItem({
      title: "Old item",
      publishedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const result = rank([old, fresh]);
    expect(result[0].title).toBe("Fresh item");
  });

  it("normalizes popularity scores relative to max", () => {
    const high = makeItem({ title: "Popular", score: 500 });
    const low = makeItem({ title: "Unpopular", score: 5 });
    const result = rank([low, high]);
    expect(result[0].title).toBe("Popular");
  });

  it("handles items with score 0", () => {
    const items = [makeItem({ score: 0 }), makeItem({ score: 0 })];
    const result = rank(items);
    expect(result).toHaveLength(2);
    result.forEach((item) => {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    });
  });

  it("handles future dates gracefully", () => {
    const future = makeItem({
      publishedAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const result = rank([future]);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBeGreaterThanOrEqual(0);
  });

  it("caps score at 100", () => {
    const superItem = makeItem({
      title: "vllm serving inference gpu latency throughput deploy",
      summary:
        "A comprehensive github.com tutorial guide on how to deploy vllm with quantization and vector embedding for rag pipeline",
      tags: ["serving", "gpu", "inference", "rag", "vector"],
      score: 1000,
      trialRecipeSuggestion: "This is a very detailed trial recipe suggestion that is quite long",
    });
    const result = rank([superItem]);
    expect(result[0].score).toBeLessThanOrEqual(100);
  });
});
