import { mkdir, readFile, writeFile, stat, rm } from "node:fs/promises";
import { join, dirname, resolve, sep } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import type { Registry, RegistryEntry, RegistryFile } from "../models/registry.js";

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
    cacheDir: process.env.T2T_CACHE_DIR ?? join(homedir(), ".trend2trial", "cache"),
    registryTtlMs: 5 * 60 * 1000,
  };
}

function resolveFileEntry(file: RegistryFile): { path: string; sha256?: string } {
  if (typeof file === "string") {
    return { path: file };
  }
  return { path: file.path, sha256: file.sha256 };
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

const RETRY_DELAYS = [500, 1000, 2000];

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return res;
      }
      // Only retry on 5xx
      if (res.status >= 500 && attempt < RETRY_DELAYS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw new Error(`HTTP ${String(res.status)} ${res.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < RETRY_DELAYS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

function validateFilePath(file: string, recipeDir: string): void {
  if (file.startsWith("/")) {
    throw new Error("Path traversal detected: " + file);
  }
  if (file.split("/").includes("..") || file.split("\\").includes("..")) {
    throw new Error("Path traversal detected: " + file);
  }
  const resolved = resolve(recipeDir, file);
  if (resolved !== recipeDir && !resolved.startsWith(recipeDir + sep)) {
    throw new Error("Path traversal detected: " + file);
  }
}

const SUPPORTED_SCHEMA_VERSIONS = [1];

export function validateRegistry(data: unknown): Registry {
  if (data === null || typeof data !== "object") {
    throw new Error("Invalid registry: expected an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.schemaVersion !== "number") {
    throw new Error("Invalid registry: missing or invalid schemaVersion");
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(obj.schemaVersion)) {
    throw new Error(
      `Unsupported registry schemaVersion: ${String(obj.schemaVersion)} (supported: ${SUPPORTED_SCHEMA_VERSIONS.join(", ")})`,
    );
  }

  if (!Array.isArray(obj.recipes) || obj.recipes.length === 0) {
    throw new Error("Invalid registry: recipes must be a non-empty array");
  }

  for (const entry of obj.recipes) {
    if (entry === null || typeof entry !== "object") {
      throw new Error("Invalid registry entry: expected an object");
    }
    const e = entry as Record<string, unknown>;
    for (const field of ["name", "title", "category", "version"] as const) {
      if (typeof e[field] !== "string" || (e[field] as string).length === 0) {
        throw new Error(
          `Invalid registry entry: missing or invalid "${field}" in recipe "${String(e.name ?? "unknown")}"`,
        );
      }
    }
    if (!Array.isArray(e.files) || e.files.length === 0) {
      throw new Error(
        `Invalid registry entry: files must be a non-empty array in recipe "${String(e.name)}"`,
      );
    }
    for (const f of e.files) {
      if (typeof f !== "string" && (typeof f !== "object" || f === null)) {
        throw new Error(`Invalid registry entry: invalid file entry in recipe "${String(e.name)}"`);
      }
    }
  }

  return data as Registry;
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
      return validateRegistry(JSON.parse(raw));
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
  const raw = await res.json();
  const registry = validateRegistry(raw);

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

  const hasLegacyFiles = entry.files.some((f) => typeof f === "string");
  if (hasLegacyFiles) {
    console.warn(
      `Warning: recipe "${entry.name}" uses legacy string[] files format without SHA256 checksums`,
    );
  }

  try {
    for (const file of entry.files) {
      const { path: filePath, sha256: expectedHash } = resolveFileEntry(file);
      validateFilePath(filePath, recipeDir);

      const url = rawUrl(opts.repo, opts.ref, `recipes/${entry.name}/${filePath}`);
      const res = await fetchWithRetry(url);
      const content = await res.text();

      if (expectedHash) {
        const actualHash = sha256(content);
        if (actualHash !== expectedHash) {
          throw new Error(
            `SHA256 mismatch for "${filePath}": expected ${expectedHash}, got ${actualHash}`,
          );
        }
      }

      const dest = join(recipeDir, filePath);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, content, "utf-8");
    }
  } catch (err) {
    // Clean up partial download
    await rm(recipeDir, { recursive: true, force: true }).catch(() => {
      // best-effort cleanup
    });
    throw err;
  }

  // Mark download complete
  await writeFile(completeMarker, new Date().toISOString(), "utf-8");

  return recipeDir;
}
