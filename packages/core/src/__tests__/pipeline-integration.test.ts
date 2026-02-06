import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fetchTrends, fetchTrendCards, runPipeline } from "../pipeline/index.js";
import type { TrendAdapter } from "../pipeline/adapters/types.js";
import type { TrendItem } from "../models/trend-item.js";

function makeItem(overrides: Partial<TrendItem> = {}): TrendItem {
  return {
    title: "Test Item",
    url: "https://example.com/test",
    source: "test",
    tags: ["ai"],
    score: 50,
    publishedAt: new Date().toISOString(),
    summary: "A test item about serving inference",
    trialRecipeSuggestion: "Try it",
    ...overrides,
  };
}

function makeMockAdapter(
  name: string,
  items: TrendItem[],
  options?: { enabled?: boolean; shouldFail?: boolean },
): TrendAdapter {
  return {
    name,
    enabled: options?.enabled ?? true,
    async fetch() {
      if (options?.shouldFail) {
        throw new Error(`${name} adapter failed`);
      }
      return items;
    },
  };
}

// RSS XML fixture for mocking fetch
const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <title>LLM Serving Benchmark</title>
      <link>https://example.com/llm-serving</link>
      <description>A benchmark for LLM serving latency.</description>
    </item>
  </channel>
</rss>`;

describe("fetchTrends", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns ranked, deduplicated TrendItems from adapters", async () => {
    // Mock fetch to handle both RSS and HN
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("arxiv")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(RSS_XML),
        });
      }
      if (urlStr.includes("topstories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([1]),
        });
      }
      if (urlStr.includes("item/1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 1,
              title: "GPU inference tool",
              url: "https://example.com/gpu-tool",
              score: 100,
              time: Math.floor(Date.now() / 1000),
            }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as unknown as typeof fetch;

    const items = await fetchTrends();
    expect(items.length).toBeGreaterThan(0);
    // Items should be ranked (have score assigned)
    for (const item of items) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it("handles RSS failure gracefully (HN results still returned)", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("arxiv")) {
        return Promise.reject(new Error("RSS network error"));
      }
      if (urlStr.includes("topstories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([1]),
        });
      }
      if (urlStr.includes("item/1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 1,
              title: "AI inference benchmark",
              url: "https://example.com/ai-bench",
              score: 50,
              time: Math.floor(Date.now() / 1000),
            }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as unknown as typeof fetch;

    // Should not throw
    const items = await fetchTrends();
    // HN items should still be returned
    expect(items.some((i) => i.source === "hackernews")).toBe(true);
  });

  it("handles HN failure gracefully (RSS results still returned)", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("arxiv")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(RSS_XML),
        });
      }
      if (urlStr.includes("hacker-news")) {
        return Promise.reject(new Error("HN network error"));
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as unknown as typeof fetch;

    const items = await fetchTrends();
    // RSS items should still be returned
    expect(items.length).toBeGreaterThan(0);
  });

  it("returns empty array when both adapters fail", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network down")) as unknown as typeof fetch;

    const items = await fetchTrends();
    expect(items).toEqual([]);
  });
});

describe("fetchTrendCards", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns TrendCard[] (converted from TrendItems)", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("arxiv")) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(RSS_XML) });
      }
      if (urlStr.includes("topstories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as unknown as typeof fetch;

    const cards = await fetchTrendCards();
    expect(cards.length).toBeGreaterThan(0);
    // TrendCards have `id`, `category`, `sources`, `date`, `relevanceScore`
    for (const card of cards) {
      expect(card.id).toBeTruthy();
      expect(card.category).toBeTruthy();
      expect(card.sources).toBeTruthy();
      expect(card.date).toBeTruthy();
      expect(typeof card.relevanceScore).toBe("number");
    }
  });
});

describe("runPipeline", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "pipeline-int-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("runs with custom adapters", async () => {
    const items = [
      makeItem({ title: "Custom vllm serving", url: "https://a.com/1" }),
      makeItem({ title: "Custom rag vector", url: "https://a.com/2" }),
    ];
    const adapter = makeMockAdapter("custom", items);

    const cards = await runPipeline({ adapters: [adapter] });
    expect(cards).toHaveLength(2);
  });

  it("writes to outputPath when specified", async () => {
    const outputPath = join(tempDir, "output.json");
    const items = [makeItem({ title: "Written card serving" })];
    const adapter = makeMockAdapter("writer-test", items);

    const cards = await runPipeline({ adapters: [adapter], outputPath });
    expect(cards).toHaveLength(1);

    // Verify file was written
    const raw = await readFile(outputPath, "utf-8");
    const envelope = JSON.parse(raw);
    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.cards).toHaveLength(1);
  });

  it("applies custom rankConfig", async () => {
    const items = [
      makeItem({ title: "Fresh serving", score: 10 }),
      makeItem({
        title: "Popular old",
        score: 500,
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ];
    const adapter = makeMockAdapter("rank-test", items);

    // Bias heavily toward popularity
    const cards = await runPipeline({
      adapters: [adapter],
      rankConfig: { popularityWeight: 90, freshnessWeight: 1 },
    });
    expect(cards[0].title).toBe("Popular old");
  });

  it("skips disabled adapters", async () => {
    const enabled = makeMockAdapter("enabled", [makeItem({ title: "Included serving" })]);
    const disabled = makeMockAdapter("disabled", [makeItem({ title: "Excluded" })], {
      enabled: false,
    });

    const cards = await runPipeline({ adapters: [enabled, disabled] });
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("Included serving");
  });

  it("handles adapter failure gracefully", async () => {
    const good = makeMockAdapter("good", [makeItem({ title: "Good item serving" })]);
    const bad = makeMockAdapter("bad", [], { shouldFail: true });

    const cards = await runPipeline({ adapters: [good, bad] });
    expect(cards).toHaveLength(1);
  });

  it("deduplicates items across adapters", async () => {
    const item = makeItem({ title: "Duplicate", url: "https://example.com/dup" });
    const adapter1 = makeMockAdapter("source1", [{ ...item, source: "source1" }]);
    const adapter2 = makeMockAdapter("source2", [{ ...item, source: "source2" }]);

    const cards = await runPipeline({ adapters: [adapter1, adapter2] });
    // Should be deduped to 1 card (cross-source dedup by URL)
    expect(cards).toHaveLength(1);
  });
});
