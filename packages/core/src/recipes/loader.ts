import { readFile, readdir, cp, stat } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import type { Recipe, RecipeMeta, TaskStep, Rubric } from "../models/recipe.js";

export async function listRecipes(recipesDir: string): Promise<RecipeMeta[]> {
  let entries: string[];
  try {
    entries = await readdir(recipesDir);
  } catch {
    return [];
  }

  const metas: RecipeMeta[] = [];

  for (const entry of entries) {
    const tasksPath = join(recipesDir, entry, "tasks.yaml");
    try {
      await stat(tasksPath);
      const raw = await readFile(tasksPath, "utf-8");
      const parsed = yaml.load(raw) as Record<string, unknown>;
      metas.push({
        name: entry,
        title: String(parsed.title ?? entry),
        category: parsed.category as RecipeMeta["category"],
        estimated_hours: String(parsed.estimated_hours ?? "unknown"),
      });
    } catch {
      // skip directories without tasks.yaml
    }
  }

  return metas;
}

export async function loadRecipe(recipeDir: string): Promise<Recipe> {
  const tasksRaw = await readFile(join(recipeDir, "tasks.yaml"), "utf-8");
  const tasksParsed = yaml.load(tasksRaw) as Record<string, unknown>;

  const rubricRaw = await readFile(join(recipeDir, "rubric.yaml"), "utf-8");
  const rubricParsed = yaml.load(rubricRaw) as Rubric;

  return {
    name: String(tasksParsed.name ?? ""),
    title: String(tasksParsed.title ?? ""),
    category: tasksParsed.category as RecipeMeta["category"],
    estimated_hours: String(tasksParsed.estimated_hours ?? "unknown"),
    tasks: tasksParsed.tasks as TaskStep[],
    rubric: rubricParsed,
  };
}

export async function copyScaffold(
  recipeDir: string,
  dest: string,
): Promise<void> {
  await cp(recipeDir, dest, { recursive: true });
}
