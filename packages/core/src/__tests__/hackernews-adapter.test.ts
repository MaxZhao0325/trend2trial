import { describe, it, expect, afterEach, vi } from "vitest";
import { fetchHackerNews, hackernewsAdapter } from "../pipeline/adapters/hackernews.js";

function makeMockStory(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "vLLM inference optimization",
    url: "https://example.com/vllm",
    score: 150,
    time: Math.floor(Date.now() / 1000),
    type: "story",
    ...overrides,
  };
}

describe("fetchHackerNews", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches top stories and filters by AI keywords", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("topstories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([1, 2, 3]),
        });
      }
      const id = Number(String(url).match(/item\/(\d+)/)?.[1]);
      if (id === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeMockStory({ id: 1, title: "vLLM serving benchmark" })),
        });
      }
      if (id === 2) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeMockStory({ id: 2, title: "Unrelated cooking recipe" })),
        });
      }
      if (id === 3) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeMockStory({ id: 3, title: "GPT-4 new features" })),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as unknown as typeof fetch;

    const items = await fetchHackerNews();
    // "cooking recipe" does not match AI keywords, so it should be filtered out
    expect(items.length).toBe(2);
    expect(items.every((i) => i.source === "hackernews")).toBe(true);
    expect(items.some((i) => i.title.includes("vLLM"))).toBe(true);
    expect(items.some((i) => i.title.includes("GPT-4"))).toBe(true);
  });

  it("skips stories without title or URL", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("topstories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([1, 2]),
        });
      }
      const id = Number(String(url).match(/item\/(\d+)/)?.[1]);
      if (id === 1) {
        // Missing URL
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, title: "LLM news", score: 10 }),
        });
      }
      if (id === 2) {
        // Missing title
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 2, url: "https://example.com", score: 10 }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as unknown as typeof fetch;

    const items = await fetchHackerNews();
    expect(items).toHaveLength(0);
  });

  it("respects maxItems option", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("topstories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([1, 2, 3, 4, 5]),
        });
      }
      const id = Number(String(url).match(/item\/(\d+)/)?.[1]);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            makeMockStory({ id, title: `AI model #${id}` }),
          ),
      });
    }) as unknown as typeof fetch;

    await fetchHackerNews({ maxItems: 2 });
    // Only 2 story IDs should be fetched
    const storyCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => !String(call[0]).includes("topstories"),
    );
    expect(storyCalls.length).toBe(2);
  });

  it("handles fetch failure for individual story gracefully", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("topstories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([1, 2]),
        });
      }
      const id = Number(String(url).match(/item\/(\d+)/)?.[1]);
      if (id === 1) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(makeMockStory({ id: 2, title: "RAG vector search" })),
      });
    }) as unknown as typeof fetch;

    // Should not throw — failed story returns null and is filtered
    const items = await fetchHackerNews({ maxItems: 2 });
    expect(items.length).toBe(1);
    expect(items[0].title).toContain("RAG");
  });

  it("throws when top stories fetch fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    }) as unknown as typeof fetch;

    await expect(fetchHackerNews()).rejects.toThrow("HN top stories fetch failed");
  });

  it("returns empty array when no stories match AI keywords", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("topstories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([1]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(makeMockStory({ title: "Best pizza in NYC" })),
      });
    }) as unknown as typeof fetch;

    const items = await fetchHackerNews();
    expect(items).toHaveLength(0);
  });

  it("returns empty array when top stories is empty", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("topstories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as unknown as typeof fetch;

    const items = await fetchHackerNews();
    expect(items).toHaveLength(0);
  });

  it("converts story time to ISO publishedAt string", async () => {
    const storyTime = 1700000000; // 2023-11-14T22:13:20Z
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("topstories")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([1]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            makeMockStory({ title: "LLM serving tool", time: storyTime }),
          ),
      });
    }) as unknown as typeof fetch;

    const items = await fetchHackerNews();
    expect(items).toHaveLength(1);
    expect(items[0].publishedAt).toBe(new Date(storyTime * 1000).toISOString());
  });
});

describe("hackernewsAdapter", () => {
  it("conforms to TrendAdapter interface", () => {
    expect(hackernewsAdapter.name).toBe("hackernews");
    expect(hackernewsAdapter.enabled).toBe(true);
    expect(typeof hackernewsAdapter.fetch).toBe("function");
  });
});
