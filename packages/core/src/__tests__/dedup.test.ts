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

describe("dedup", () => {
  it("returns empty array for empty input", () => {
    expect(dedup([])).toEqual([]);
  });

  it("keeps single item unchanged", () => {
    const items = [makeItem()];
    expect(dedup(items)).toEqual(items);
  });

  it("removes exact duplicate items", () => {
    const item = makeItem();
    const result = dedup([item, { ...item }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(item);
  });

  it("removes items with normalized title match and same url", () => {
    const a = makeItem({ title: "Hello, World!" });
    const b = makeItem({ title: "hello world" });
    const result = dedup([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Hello, World!");
  });

  it("keeps items with same title but different url", () => {
    const a = makeItem({ title: "Same Title", url: "https://a.com" });
    const b = makeItem({ title: "Same Title", url: "https://b.com" });
    const result = dedup([a, b]);
    expect(result).toHaveLength(2);
  });

  it("keeps items with different titles but same url", () => {
    const a = makeItem({ title: "Title A", url: "https://same.com" });
    const b = makeItem({ title: "Title B", url: "https://same.com" });
    const result = dedup([a, b]);
    expect(result).toHaveLength(2);
  });

  it("preserves order of first occurrence", () => {
    const first = makeItem({ title: "First", url: "https://a.com", source: "rss" });
    const second = makeItem({ title: "Second", url: "https://b.com", source: "hn" });
    const dupe = makeItem({ title: "First", url: "https://a.com", source: "hn" });
    const result = dedup([first, second, dupe]);
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("rss");
    expect(result[1].source).toBe("hn");
  });
});
