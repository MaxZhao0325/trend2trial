import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fetchRegistry, fetchRecipe } from "../recipes/fetcher.js";
import type { FetcherOptions } from "../recipes/fetcher.js";
import type { Registry, RegistryEntry } from "../models/registry.js";

const SAMPLE_REGISTRY: Registry = {
  schemaVersion: 1,
  updatedAt: "2026-01-01",
  recipes: [
    {
      name: "test-recipe",
      title: "Test Recipe",
      category: "serving",
      estimated_hours: "0.5",
      version: "0.1.0",
      files: ["tasks.yaml", "scaffold/server.mjs"],
    },
  ],
};

function makeOpts(cacheDir: string): FetcherOptions {
  return {
    repo: "test/repo",
    ref: "main",
    cacheDir,
    registryTtlMs: 5 * 60 * 1000,
  };
}

describe("fetchRegistry", () => {
  let cacheDir: string;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "fetcher-test-"));
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("fetches registry from remote and caches it", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_REGISTRY),
    }) as unknown as typeof fetch;

    const opts = makeOpts(cacheDir);
    const registry = await fetchRegistry(opts);

    expect(registry.schemaVersion).toBe(1);
    expect(registry.recipes).toHaveLength(1);
    expect(registry.recipes[0].name).toBe("test-recipe");

    // Verify it was cached
    const cached = await readFile(join(cacheDir, "registry.json"), "utf-8");
    expect(JSON.parse(cached)).toEqual(SAMPLE_REGISTRY);
  });

  it("returns cached registry within TTL", async () => {
    // Pre-populate cache
    const { writeFile: wf, mkdir } = await import("node:fs/promises");
    await mkdir(cacheDir, { recursive: true });
    await wf(
      join(cacheDir, "registry.json"),
      JSON.stringify(SAMPLE_REGISTRY),
      "utf-8",
    );

    globalThis.fetch = vi.fn() as unknown as typeof fetch;

    const opts = makeOpts(cacheDir);
    const registry = await fetchRegistry(opts);

    expect(registry.recipes[0].name).toBe("test-recipe");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("re-fetches when cache is expired", async () => {
    // Pre-populate cache with old timestamp
    const { writeFile: wf, mkdir, utimes } = await import("node:fs/promises");
    await mkdir(cacheDir, { recursive: true });
    const cachedPath = join(cacheDir, "registry.json");
    await wf(cachedPath, JSON.stringify(SAMPLE_REGISTRY), "utf-8");
    // Set mtime to 10 minutes ago
    const past = new Date(Date.now() - 10 * 60 * 1000);
    await utimes(cachedPath, past, past);

    const updated = { ...SAMPLE_REGISTRY, updatedAt: "2026-02-01" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updated),
    }) as unknown as typeof fetch;

    const opts = makeOpts(cacheDir);
    const registry = await fetchRegistry(opts);

    expect(registry.updatedAt).toBe("2026-02-01");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws on HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    }) as unknown as typeof fetch;

    const opts = makeOpts(cacheDir);
    await expect(fetchRegistry(opts)).rejects.toThrow("404 Not Found");
  });
});

describe("fetchRecipe", () => {
  let cacheDir: string;
  const originalFetch = globalThis.fetch;

  const entry: RegistryEntry = {
    name: "test-recipe",
    title: "Test Recipe",
    category: "serving",
    estimated_hours: "0.5",
    version: "0.1.0",
    files: ["tasks.yaml", "scaffold/server.mjs"],
  };

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "fetcher-recipe-"));
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("downloads all files and marks complete", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("tasks.yaml")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve("name: test-recipe\ntasks: []\n"),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve("// server code\n"),
      });
    }) as unknown as typeof fetch;

    const opts = makeOpts(cacheDir);
    const dir = await fetchRecipe(entry, opts);

    expect(dir).toBe(join(cacheDir, "test-recipe", "0.1.0"));

    const tasks = await readFile(join(dir, "tasks.yaml"), "utf-8");
    expect(tasks).toContain("test-recipe");

    const server = await readFile(join(dir, "scaffold", "server.mjs"), "utf-8");
    expect(server).toContain("server code");

    // .complete marker exists
    const marker = await stat(join(dir, ".complete"));
    expect(marker.isFile()).toBe(true);
  });

  it("skips download when .complete marker exists", async () => {
    // Pre-create cached recipe
    const { writeFile: wf, mkdir } = await import("node:fs/promises");
    const dir = join(cacheDir, "test-recipe", "0.1.0");
    await mkdir(dir, { recursive: true });
    await wf(join(dir, ".complete"), "done", "utf-8");
    await wf(join(dir, "tasks.yaml"), "cached", "utf-8");

    globalThis.fetch = vi.fn() as unknown as typeof fetch;

    const opts = makeOpts(cacheDir);
    const result = await fetchRecipe(entry, opts);

    expect(result).toBe(dir);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("throws when a file download fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    }) as unknown as typeof fetch;

    const opts = makeOpts(cacheDir);
    await expect(fetchRecipe(entry, opts)).rejects.toThrow("404 Not Found");
  });
});
