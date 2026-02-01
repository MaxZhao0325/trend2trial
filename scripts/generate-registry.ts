/**
 * Scans recipes/ and generates registry.json.
 * Run: pnpm tsx scripts/generate-registry.ts
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const recipesDir = join(root, "recipes");

interface RegistryEntry {
  name: string;
  title: string;
  category: string;
  estimated_hours: string;
  version: string;
  files: string[];
}

interface Registry {
  schemaVersion: number;
  updatedAt: string;
  recipes: RegistryEntry[];
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await listFilesRecursive(full);
      results.push(...sub);
    } else {
      results.push(full);
    }
  }
  return results;
}

async function main(): Promise<void> {
  const entries = await readdir(recipesDir);
  const recipes: RegistryEntry[] = [];

  for (const name of entries.sort()) {
    const recipeDir = join(recipesDir, name);
    const info = await stat(recipeDir);
    if (!info.isDirectory()) continue;

    const tasksPath = join(recipeDir, "tasks.yaml");
    try {
      await stat(tasksPath);
    } catch {
      continue; // skip non-recipe directories
    }

    const raw = await readFile(tasksPath, "utf-8");
    const parsed = yaml.load(raw) as Record<string, unknown>;

    const allFiles = await listFilesRecursive(recipeDir);
    const files = allFiles
      .map((f) => relative(recipeDir, f))
      .filter((f) => !f.startsWith("."))
      .sort();

    recipes.push({
      name,
      title: String(parsed.title ?? name),
      category: String(parsed.category ?? "unknown"),
      estimated_hours: String(parsed.estimated_hours ?? "unknown"),
      version: "0.1.0",
      files,
    });
  }

  const registry: Registry = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString().slice(0, 10),
    recipes,
  };

  const outPath = join(recipesDir, "registry.json");
  await writeFile(outPath, JSON.stringify(registry, null, 2) + "\n", "utf-8");
  console.log(`Written ${outPath} with ${String(recipes.length)} recipes`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
