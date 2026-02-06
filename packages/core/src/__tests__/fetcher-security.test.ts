import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { fetchRecipe } from "../recipes/fetcher.js";
import type { FetcherOptions } from "../recipes/fetcher.js";
import type { RegistryEntry } from "../models/registry.js";

function makeOpts(cacheDir: string): FetcherOptions {
  return {
    repo: "test/repo",
    ref: "main",
    cacheDir,
    registryTtlMs: 5 * 60 * 1000,
  };
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

describe("fetchRecipe — path traversal protection", () => {
  let cacheDir: string;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "fetcher-sec-"));
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("rejects path traversal with ../../.bashrc", async () => {
    const entry: RegistryEntry = {
      name: "evil-recipe",
      title: "Evil Recipe",
      category: "serving",
      estimated_hours: "1",
      version: "0.1.0",
      files: ["../../.bashrc"],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("malicious content"),
    }) as unknown as typeof fetch;

    await expect(fetchRecipe(entry, makeOpts(cacheDir))).rejects.toThrow("Path traversal detected");
  });

  it("rejects path traversal with ../ in middle of path", async () => {
    const entry: RegistryEntry = {
      name: "evil-recipe",
      title: "Evil Recipe",
      category: "serving",
      estimated_hours: "1",
      version: "0.1.0",
      files: ["scaffold/../../../etc/passwd"],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("malicious content"),
    }) as unknown as typeof fetch;

    await expect(fetchRecipe(entry, makeOpts(cacheDir))).rejects.toThrow("Path traversal detected");
  });

  it("rejects absolute paths", async () => {
    const entry: RegistryEntry = {
      name: "evil-recipe",
      title: "Evil Recipe",
      category: "serving",
      estimated_hours: "1",
      version: "0.1.0",
      files: ["/etc/passwd"],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("malicious content"),
    }) as unknown as typeof fetch;

    await expect(fetchRecipe(entry, makeOpts(cacheDir))).rejects.toThrow("Path traversal detected");
  });

  it("allows safe nested paths like scaffold/server.js", async () => {
    const entry: RegistryEntry = {
      name: "safe-recipe",
      title: "Safe Recipe",
      category: "serving",
      estimated_hours: "1",
      version: "0.1.0",
      files: ["tasks.yaml", "scaffold/server.js"],
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("tasks.yaml")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve("name: safe-recipe"),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve("// server code"),
      });
    }) as unknown as typeof fetch;

    const dir = await fetchRecipe(entry, makeOpts(cacheDir));
    expect(dir).toContain("safe-recipe");
  });
});

describe("fetchRecipe — partial download cleanup", () => {
  let cacheDir: string;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "fetcher-cleanup-"));
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("cleans up partial download on fetch failure", async () => {
    const entry: RegistryEntry = {
      name: "fail-recipe",
      title: "Fail Recipe",
      category: "serving",
      estimated_hours: "1",
      version: "0.1.0",
      files: ["tasks.yaml", "second-file.txt"],
    };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve("first file content"),
        });
      }
      // Second file fails with non-retryable error
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
    }) as unknown as typeof fetch;

    await expect(fetchRecipe(entry, makeOpts(cacheDir))).rejects.toThrow();

    // The recipe directory should be cleaned up
    const recipeDir = join(cacheDir, "fail-recipe", "0.1.0");
    await expect(stat(recipeDir)).rejects.toThrow();
  });

  it("cleans up partial download on path traversal", async () => {
    const entry: RegistryEntry = {
      name: "traversal-recipe",
      title: "Traversal Recipe",
      category: "serving",
      estimated_hours: "1",
      version: "0.1.0",
      files: ["tasks.yaml", "../../escape.txt"],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("content"),
    }) as unknown as typeof fetch;

    await expect(fetchRecipe(entry, makeOpts(cacheDir))).rejects.toThrow("Path traversal");

    const recipeDir = join(cacheDir, "traversal-recipe", "0.1.0");
    await expect(stat(recipeDir)).rejects.toThrow();
  });
});

describe("fetchRecipe — SHA256 checksum verification", () => {
  let cacheDir: string;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "fetcher-checksum-"));
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("passes when SHA256 matches", async () => {
    const fileContent = "name: verified-recipe\ntasks: []\n";
    const hash = sha256(fileContent);

    const entry: RegistryEntry = {
      name: "verified-recipe",
      title: "Verified Recipe",
      category: "serving",
      estimated_hours: "1",
      version: "0.1.0",
      files: [{ path: "tasks.yaml", sha256: hash } as unknown as string],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(fileContent),
    }) as unknown as typeof fetch;

    const dir = await fetchRecipe(entry, makeOpts(cacheDir));
    expect(dir).toContain("verified-recipe");
  });

  it("throws on SHA256 mismatch", async () => {
    const entry: RegistryEntry = {
      name: "tampered-recipe",
      title: "Tampered Recipe",
      category: "serving",
      estimated_hours: "1",
      version: "0.1.0",
      files: [
        {
          path: "tasks.yaml",
          sha256: "deadbeef0000000000000000000000000000000000000000000000000000dead",
        } as unknown as string,
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("actual file content"),
    }) as unknown as typeof fetch;

    await expect(fetchRecipe(entry, makeOpts(cacheDir))).rejects.toThrow("SHA256 mismatch");
  });

  it("skips checksum for legacy string file entries", async () => {
    const entry: RegistryEntry = {
      name: "legacy-recipe",
      title: "Legacy Recipe",
      category: "serving",
      estimated_hours: "1",
      version: "0.1.0",
      files: ["tasks.yaml"],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("file content"),
    }) as unknown as typeof fetch;

    // Should succeed without checksum validation
    const dir = await fetchRecipe(entry, makeOpts(cacheDir));
    expect(dir).toContain("legacy-recipe");
  });
});

describe("fetchRecipe — retry behavior", () => {
  let cacheDir: string;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "fetcher-retry-"));
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("retries on 500 and succeeds", async () => {
    const entry: RegistryEntry = {
      name: "retry-recipe",
      title: "Retry Recipe",
      category: "serving",
      estimated_hours: "1",
      version: "0.1.0",
      files: ["tasks.yaml"],
    };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call returns 500
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        });
      }
      // Second call succeeds
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve("file content"),
      });
    }) as unknown as typeof fetch;

    const dir = await fetchRecipe(entry, makeOpts(cacheDir));
    expect(dir).toContain("retry-recipe");
    expect(callCount).toBeGreaterThanOrEqual(2);
  }, 15000);

  it("eventually fails on persistent 404", async () => {
    const entry: RegistryEntry = {
      name: "notfound-recipe",
      title: "NotFound Recipe",
      category: "serving",
      estimated_hours: "1",
      version: "0.1.0",
      files: ["tasks.yaml"],
    };

    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
    }) as unknown as typeof fetch;

    await expect(fetchRecipe(entry, makeOpts(cacheDir))).rejects.toThrow("404 Not Found");
  }, 15000);
});
