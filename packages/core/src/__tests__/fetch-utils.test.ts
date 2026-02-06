import { describe, it, expect, afterEach, vi } from "vitest";
import { fetchWithRetry, runWithConcurrency } from "../pipeline/fetch-utils.js";

describe("fetchWithRetry", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns response on first successful try", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("ok"),
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.com", { timeout: 5000 });
    expect(res.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 503 status and succeeds on second attempt", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 503, statusText: "Service Unavailable" });
      }
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("ok") });
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.com", { maxRetries: 2, timeout: 5000 });
    expect(res.ok).toBe(true);
    expect(callCount).toBe(2);
  });

  it("retries on 429 status", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({ ok: false, status: 429, statusText: "Too Many Requests" });
      }
      return Promise.resolve({ ok: true, status: 200 });
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.com", { maxRetries: 2, timeout: 5000 });
    expect(res.ok).toBe(true);
    expect(callCount).toBe(3);
  });

  it("gives up after maxRetries and returns the last response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.com", { maxRetries: 1, timeout: 5000 });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
    // 1 initial + 1 retry = 2
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on network error (ECONNRESET)", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("ECONNRESET"));
      }
      return Promise.resolve({ ok: true, status: 200 });
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.com", { maxRetries: 2, timeout: 5000 });
    expect(res.ok).toBe(true);
    expect(callCount).toBe(2);
  });

  it("throws non-retryable error immediately", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(
      new TypeError("Invalid URL"),
    ) as unknown as typeof fetch;

    await expect(
      fetchWithRetry("not-a-url", { maxRetries: 2, timeout: 5000 }),
    ).rejects.toThrow("Invalid URL");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-retryable HTTP status (e.g. 404)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    }) as unknown as typeof fetch;

    const res = await fetchWithRetry("https://example.com/missing", { maxRetries: 2, timeout: 5000 });
    expect(res.status).toBe(404);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("runWithConcurrency", () => {
  it("runs all tasks and returns results in order", async () => {
    const tasks = [
      () => Promise.resolve("a"),
      () => Promise.resolve("b"),
      () => Promise.resolve("c"),
    ];
    const results = await runWithConcurrency(tasks, 2);
    expect(results).toEqual(["a", "b", "c"]);
  });

  it("respects concurrency limit", async () => {
    let running = 0;
    let maxRunning = 0;

    const makeTask = (value: string) => async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running--;
      return value;
    };

    const tasks = [makeTask("a"), makeTask("b"), makeTask("c"), makeTask("d"), makeTask("e")];
    const results = await runWithConcurrency(tasks, 2);

    expect(results).toEqual(["a", "b", "c", "d", "e"]);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it("handles empty task array", async () => {
    const results = await runWithConcurrency([], 5);
    expect(results).toEqual([]);
  });

  it("handles single task", async () => {
    const results = await runWithConcurrency([() => Promise.resolve(42)], 3);
    expect(results).toEqual([42]);
  });

  it("preserves result order even when tasks complete out of order", async () => {
    const tasks = [
      () => new Promise<string>((resolve) => setTimeout(() => resolve("slow"), 30)),
      () => new Promise<string>((resolve) => setTimeout(() => resolve("fast"), 5)),
    ];
    const results = await runWithConcurrency(tasks, 2);
    expect(results).toEqual(["slow", "fast"]);
  });
});
