import { describe, it, expect } from "vitest";
import { rank, DEFAULT_RANK_CONFIG } from "../pipeline/ranker.js";
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

describe("rank — custom config", () => {
  it("custom freshnessWeight changes ranking outcome", () => {
    const now = new Date();
    const fresh = makeItem({
      title: "Fresh",
      publishedAt: now.toISOString(),
      score: 10,
    });
    const old = makeItem({
      title: "Old but popular",
      publishedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      score: 500,
    });

    // With very high freshness weight, fresh item should win
    const freshBias = rank([old, fresh], { freshnessWeight: 80, popularityWeight: 5 });
    expect(freshBias[0].title).toBe("Fresh");

    // With very low freshness weight, popular item should win
    const popBias = rank([old, fresh], { freshnessWeight: 1, popularityWeight: 80 });
    expect(popBias[0].title).toBe("Old but popular");
  });

  it("custom infraKeywords list used instead of default", () => {
    const item = makeItem({
      title: "Custom keyword match",
      summary: "Contains mycustomkw",
      score: 50,
    });
    const plain = makeItem({
      title: "No match",
      summary: "Nothing relevant",
      score: 50,
    });

    const result = rank([plain, item], {
      infraKeywords: ["mycustomkw"],
      infraWeight: 50,
    });
    expect(result[0].title).toBe("Custom keyword match");
  });

  it("custom halfLifeDays affects freshness decay", () => {
    const now = new Date();
    const weekOld = makeItem({
      title: "Week old",
      publishedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // With halfLifeDays=7, a 7-day-old item gets 50% of freshness weight
    const shortHalfLife = rank([weekOld], { halfLifeDays: 7 });
    // With halfLifeDays=30, the same item gets much more freshness
    const longHalfLife = rank([weekOld], { halfLifeDays: 30 });

    expect(longHalfLife[0].score).toBeGreaterThan(shortHalfLife[0].score);
  });

  it("setting popularityWeight to 0 eliminates popularity factor", () => {
    const popular = makeItem({ title: "Popular", score: 1000 });
    const unpopular = makeItem({
      title: "vllm serving inference gpu",
      summary: "latency throughput optimization for rag vector embedding",
      tags: ["serving", "gpu"],
      score: 1,
    });

    // With no popularity, infra relevance dominates
    const result = rank([popular, unpopular], { popularityWeight: 0 });
    expect(result[0].title).toContain("vllm");
  });

  it("partial config merges with defaults", () => {
    const items = [makeItem({ score: 50 })];
    // Only override one field — the rest should use defaults
    const result = rank(items, { freshnessWeight: 10 });
    expect(result).toHaveLength(1);
    expect(result[0].score).toBeGreaterThanOrEqual(0);
    expect(result[0].score).toBeLessThanOrEqual(100);
  });
});

describe("rank — non-mutating behavior", () => {
  it("does not mutate original items array", () => {
    const items = [makeItem({ title: "B", score: 10 }), makeItem({ title: "A", score: 100 })];
    const originalFirst = items[0].title;
    rank(items);
    expect(items[0].title).toBe(originalFirst);
  });

  it("returns a new array (not same reference)", () => {
    const items = [makeItem()];
    const result = rank(items);
    expect(result).not.toBe(items);
  });

  it("items in returned array are new objects", () => {
    const items = [makeItem({ score: 50 })];
    const result = rank(items);
    // The spread operator in ranker creates new objects
    expect(result[0]).not.toBe(items[0]);
    expect(result[0].title).toBe(items[0].title);
  });
});

describe("rank — learningRoiScore", () => {
  it("items with github.com URL score higher ROI", () => {
    const ghItem = makeItem({
      title: "Tool A",
      url: "https://github.com/org/repo",
      score: 50,
    });
    const otherItem = makeItem({
      title: "Tool B",
      url: "https://blog.example.com/post",
      score: 50,
    });

    const result = rank([otherItem, ghItem]);
    expect(result[0].title).toBe("Tool A");
  });

  it("items with long trialRecipeSuggestion score higher ROI", () => {
    const detailed = makeItem({
      title: "Item A",
      trialRecipeSuggestion:
        "This is a very detailed recipe suggestion with multiple steps to follow",
      score: 50,
    });
    const brief = makeItem({
      title: "Item B",
      trialRecipeSuggestion: "Try it",
      score: 50,
    });

    const result = rank([brief, detailed]);
    expect(result[0].title).toBe("Item A");
  });

  it("items with long summary score higher ROI", () => {
    const longSummary = makeItem({
      title: "Item A",
      summary: "A".repeat(150),
      score: 50,
    });
    const shortSummary = makeItem({
      title: "Item B",
      summary: "Short",
      score: 50,
    });

    const result = rank([shortSummary, longSummary]);
    expect(result[0].title).toBe("Item A");
  });
});

describe("rank — DEFAULT_RANK_CONFIG", () => {
  it("exports default config with expected shape", () => {
    expect(DEFAULT_RANK_CONFIG.freshnessWeight).toBe(25);
    expect(DEFAULT_RANK_CONFIG.popularityWeight).toBe(25);
    expect(DEFAULT_RANK_CONFIG.infraWeight).toBe(30);
    expect(DEFAULT_RANK_CONFIG.roiWeight).toBe(20);
    expect(DEFAULT_RANK_CONFIG.halfLifeDays).toBe(7);
    expect(Array.isArray(DEFAULT_RANK_CONFIG.infraKeywords)).toBe(true);
    expect(DEFAULT_RANK_CONFIG.infraKeywords.length).toBeGreaterThan(0);
  });
});
