import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { RecipeMeta } from "../models/recipe.js";
import type { FetcherOptions } from "./fetcher.js";
import {
  fetchRegistry,
  fetchRecipe,
  getDefaultFetcherOptions,
} from "./fetcher.js";
import { listRecipes } from "./loader.js";

export interface ResolveOptions {
  localRecipesDir?: string;
  fetcher?: FetcherOptions;
}

/**
 * Find the local recipes/ directory relative to this package.
 * Returns undefined when running via npx (no local repo).
 */
export function findLocalRecipesDir(root: string | undefined): string | undefined {
  if (!root) return undefined;
  return join(root, "recipes");
}

export async function resolveRecipeList(
  opts: ResolveOptions = {},
): Promise<RecipeMeta[]> {
  // Try local first
  if (opts.localRecipesDir) {
    try {
      const info = await stat(opts.localRecipesDir);
      if (info.isDirectory()) {
        const entries = await readdir(opts.localRecipesDir);
        if (entries.length > 0) {
          return listRecipes(opts.localRecipesDir);
        }
      }
    } catch {
      // fall through to remote
    }
  }

  // Remote fallback
  const fetcherOpts = opts.fetcher ?? getDefaultFetcherOptions();
  const registry = await fetchRegistry(fetcherOpts);
  return registry.recipes.map((r) => ({
    name: r.name,
    title: r.title,
    category: r.category,
    estimated_hours: r.estimated_hours,
  }));
}

export async function resolveRecipeDir(
  name: string,
  opts: ResolveOptions = {},
): Promise<string> {
  // Try local first
  if (opts.localRecipesDir) {
    const localDir = join(opts.localRecipesDir, name);
    try {
      const info = await stat(join(localDir, "tasks.yaml"));
      if (info.isFile()) {
        return localDir;
      }
    } catch {
      // fall through to remote
    }
  }

  // Remote fallback
  const fetcherOpts = opts.fetcher ?? getDefaultFetcherOptions();
  const registry = await fetchRegistry(fetcherOpts);
  const entry = registry.recipes.find((r) => r.name === name);
  if (!entry) {
    throw new Error(
      `Recipe "${name}" not found. Run "trend2trial recipe list" to see available recipes.`,
    );
  }
  return fetchRecipe(entry, fetcherOpts);
}
