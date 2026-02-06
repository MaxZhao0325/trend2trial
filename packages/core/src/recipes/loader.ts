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

const VALID_CATEGORIES = ["serving", "rag", "llmops"] as const;

function validateTasksData(data: unknown): {
  name: string;
  title: string;
  category: RecipeMeta["category"];
  estimated_hours: string;
  tasks: TaskStep[];
} {
  if (data === null || typeof data !== "object") {
    throw new Error("Invalid tasks.yaml: expected an object");
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.name !== "string" || obj.name.length === 0) {
    throw new Error("Invalid tasks.yaml: missing or invalid 'name'");
  }
  if (typeof obj.title !== "string" || obj.title.length === 0) {
    throw new Error("Invalid tasks.yaml: missing or invalid 'title'");
  }
  if (
    typeof obj.category !== "string" ||
    !VALID_CATEGORIES.includes(obj.category as (typeof VALID_CATEGORIES)[number])
  ) {
    throw new Error(
      `Invalid tasks.yaml: 'category' must be one of: ${VALID_CATEGORIES.join(", ")}`,
    );
  }

  if (!Array.isArray(obj.tasks) || obj.tasks.length === 0) {
    throw new Error("Invalid tasks.yaml: 'tasks' must be a non-empty array");
  }

  for (let i = 0; i < obj.tasks.length; i++) {
    const task = obj.tasks[i] as Record<string, unknown> | null;
    if (task === null || typeof task !== "object") {
      throw new Error(`Invalid tasks.yaml: task[${String(i)}] must be an object`);
    }
    if (typeof task.name !== "string" || task.name.length === 0) {
      throw new Error(`Invalid tasks.yaml: task[${String(i)}] missing 'name'`);
    }
    if (typeof task.description !== "string" || task.description.length === 0) {
      throw new Error(`Invalid tasks.yaml: task[${String(i)}] missing 'description'`);
    }
    if (typeof task.command !== "string" || task.command.length === 0) {
      throw new Error(`Invalid tasks.yaml: task[${String(i)}] missing 'command'`);
    }
    if (task.timeout_seconds !== undefined && typeof task.timeout_seconds !== "number") {
      throw new Error(`Invalid tasks.yaml: task[${String(i)}] 'timeout_seconds' must be a number`);
    }
  }

  return {
    name: obj.name as string,
    title: obj.title as string,
    category: obj.category as RecipeMeta["category"],
    estimated_hours: String(obj.estimated_hours ?? "unknown"),
    tasks: obj.tasks as TaskStep[],
  };
}

function validateRubricData(data: unknown): Rubric {
  if (data === null || typeof data !== "object") {
    throw new Error("Invalid rubric.yaml: expected an object");
  }
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.metrics)) {
    throw new Error("Invalid rubric.yaml: 'metrics' must be an array");
  }

  for (let i = 0; i < obj.metrics.length; i++) {
    const metric = obj.metrics[i] as Record<string, unknown> | null;
    if (metric === null || typeof metric !== "object") {
      throw new Error(`Invalid rubric.yaml: metric[${String(i)}] must be an object`);
    }
    if (typeof metric.name !== "string" || metric.name.length === 0) {
      throw new Error(`Invalid rubric.yaml: metric[${String(i)}] missing 'name'`);
    }
    if (typeof metric.description !== "string" || metric.description.length === 0) {
      throw new Error(`Invalid rubric.yaml: metric[${String(i)}] missing 'description'`);
    }
    if (typeof metric.unit !== "string" || metric.unit.length === 0) {
      throw new Error(`Invalid rubric.yaml: metric[${String(i)}] missing 'unit'`);
    }
  }

  if (typeof obj.pass_criteria !== "string" || obj.pass_criteria.length === 0) {
    throw new Error("Invalid rubric.yaml: missing 'pass_criteria'");
  }

  return obj as unknown as Rubric;
}

export async function loadRecipe(recipeDir: string): Promise<Recipe> {
  const tasksRaw = await readFile(join(recipeDir, "tasks.yaml"), "utf-8");
  const tasksParsed = validateTasksData(yaml.load(tasksRaw));

  const rubricRaw = await readFile(join(recipeDir, "rubric.yaml"), "utf-8");
  const rubricParsed = validateRubricData(yaml.load(rubricRaw));

  return {
    name: tasksParsed.name,
    title: tasksParsed.title,
    category: tasksParsed.category,
    estimated_hours: tasksParsed.estimated_hours,
    tasks: tasksParsed.tasks,
    rubric: rubricParsed,
  };
}

export async function copyScaffold(recipeDir: string, dest: string): Promise<void> {
  await cp(recipeDir, dest, { recursive: true });
}
