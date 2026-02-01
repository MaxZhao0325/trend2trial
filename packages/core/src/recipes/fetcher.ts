import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { Registry, RegistryEntry } from "../models/registry.js";

export interface FetcherOptions {
  repo: string;
  ref: string;
  cacheDir: string;
  registryTtlMs: number;
}

export function getDefaultFetcherOptions(): FetcherOptions {
  return {
    repo: process.env.T2T_REPO ?? "MaxZhao0325/trend2trial",
    ref: process.env.T2T_REF ?? "main",
    cacheDir:
      process.env.T2T_CACHE_DIR ??
      join(homedir(), ".trend2trial", "cache"),
    registryTtlMs: 5 * 60 * 1000,
  };
}

function rawUrl(repo: string, ref: string, path: string): string {
  return `https://raw.githubusercontent.com/${repo}/${ref}/${path}`;
}

export async function fetchRegistry(
  opts: FetcherOptions = getDefaultFetcherOptions(),
): Promise<Registry> {
  const cachedPath = join(opts.cacheDir, "registry.json");

  // Check cache TTL
  try {
    const info = await stat(cachedPath);
    const age = Date.now() - info.mtimeMs;
    if (age < opts.registryTtlMs) {
      const raw = await readFile(cachedPath, "utf-8");
      return JSON.parse(raw) as Registry;
    }
  } catch {
    // cache miss — fetch from remote
  }

  const url = rawUrl(opts.repo, opts.ref, "recipes/registry.json");
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch registry from ${url}: ${String(res.status)} ${res.statusText}`,
    );
  }
  const registry = (await res.json()) as Registry;

  // Write cache
  await mkdir(opts.cacheDir, { recursive: true });
  await writeFile(cachedPath, JSON.stringify(registry, null, 2), "utf-8");

  return registry;
}

export async function fetchRecipe(
  entry: RegistryEntry,
  opts: FetcherOptions = getDefaultFetcherOptions(),
): Promise<string> {
  const recipeDir = join(opts.cacheDir, entry.name, entry.version);
  const completeMarker = join(recipeDir, ".complete");

  // Already cached?
  try {
    await stat(completeMarker);
    return recipeDir;
  } catch {
    // not cached — download
  }

  await mkdir(recipeDir, { recursive: true });

  for (const file of entry.files) {
    const url = rawUrl(
      opts.repo,
      opts.ref,
      `recipes/${entry.name}/${file}`,
    );
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Failed to fetch ${url}: ${String(res.status)} ${res.statusText}`,
      );
    }
    const content = await res.text();
    const dest = join(recipeDir, file);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, content, "utf-8");
  }

  // Mark download complete
  await writeFile(completeMarker, new Date().toISOString(), "utf-8");

  return recipeDir;
}
