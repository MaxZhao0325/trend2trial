import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findLocalRecipesDir, resolveRecipeList, resolveRecipeDir } from "../recipes/resolver.js";
import type { Registry } from "../models/registry.js";

const REMOTE_REGISTRY: Registry = {
  schemaVersion: 1,
  updatedAt: "2026-01-01",
  recipes: [
    {
      name: "remote-recipe",
      title: "Remote Recipe",
      category: "rag",
      estimated_hours: "1",
      version: "0.1.0",
      files: ["tasks.yaml"],
    },
  ],
};

describe("findLocalRecipesDir", () => {
  it("returns undefined when root is undefined", () => {
    expect(findLocalRecipesDir(undefined)).toBeUndefined();
  });

  it("returns recipes path when root is provided", () => {
    expect(findLocalRecipesDir("/some/root")).toBe("/some/root/recipes");
  });
});

describe("resolveRecipeList", () => {
  let tempDir: string;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "resolver-list-"));
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("uses local recipes when available", async () => {
    const recipesDir = join(tempDir, "recipes");
    const recipeDir = join(recipesDir, "local-recipe");
    await mkdir(recipeDir, { recursive: true });
    await writeFile(
      join(recipeDir, "tasks.yaml"),
      'name: local-recipe\ntitle: Local Recipe\ncategory: serving\nestimated_hours: "0.5"\ntasks: []\n',
    );

    const result = await resolveRecipeList({ localRecipesDir: recipesDir });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("local-recipe");
  });

  it("falls back to remote when local dir is missing", async () => {
    const cacheDir = join(tempDir, "cache");

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(REMOTE_REGISTRY),
    }) as unknown as typeof fetch;

    const result = await resolveRecipeList({
      localRecipesDir: join(tempDir, "nonexistent"),
      fetcher: {
        repo: "test/repo",
        ref: "main",
        cacheDir,
        registryTtlMs: 5 * 60 * 1000,
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("remote-recipe");
  });

  it("falls back to remote when local dir is empty", async () => {
    const recipesDir = join(tempDir, "recipes");
    await mkdir(recipesDir, { recursive: true });
    const cacheDir = join(tempDir, "cache");

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(REMOTE_REGISTRY),
    }) as unknown as typeof fetch;

    const result = await resolveRecipeList({
      localRecipesDir: recipesDir,
      fetcher: {
        repo: "test/repo",
        ref: "main",
        cacheDir,
        registryTtlMs: 5 * 60 * 1000,
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("remote-recipe");
  });
});

describe("resolveRecipeDir", () => {
  let tempDir: string;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "resolver-dir-"));
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns local recipe dir when it exists", async () => {
    const recipesDir = join(tempDir, "recipes");
    const recipeDir = join(recipesDir, "my-recipe");
    await mkdir(recipeDir, { recursive: true });
    await writeFile(join(recipeDir, "tasks.yaml"), "name: my-recipe\n");

    const result = await resolveRecipeDir("my-recipe", {
      localRecipesDir: recipesDir,
    });
    expect(result).toBe(recipeDir);
  });

  it("fetches from remote when local does not exist", async () => {
    const cacheDir = join(tempDir, "cache");

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("registry.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(REMOTE_REGISTRY),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve("name: remote-recipe\ntasks: []\n"),
      });
    }) as unknown as typeof fetch;

    const result = await resolveRecipeDir("remote-recipe", {
      localRecipesDir: join(tempDir, "nonexistent"),
      fetcher: {
        repo: "test/repo",
        ref: "main",
        cacheDir,
        registryTtlMs: 5 * 60 * 1000,
      },
    });

    expect(result).toBe(join(cacheDir, "remote-recipe", "0.1.0"));
  });

  it("throws when recipe is not found in registry", async () => {
    const cacheDir = join(tempDir, "cache");

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(REMOTE_REGISTRY),
    }) as unknown as typeof fetch;

    await expect(
      resolveRecipeDir("nonexistent", {
        fetcher: {
          repo: "test/repo",
          ref: "main",
          cacheDir,
          registryTtlMs: 5 * 60 * 1000,
        },
      }),
    ).rejects.toThrow('Recipe "nonexistent" not found');
  });
});
