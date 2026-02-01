import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { listRecipes, loadRecipe } from "../recipes/loader.js";

describe("listRecipes", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "recipe-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns empty array for non-existent directory", async () => {
    const result = await listRecipes(join(tempDir, "nonexistent"));
    expect(result).toEqual([]);
  });

  it("returns empty array for directory without recipes", async () => {
    const result = await listRecipes(tempDir);
    expect(result).toEqual([]);
  });

  it("finds recipes with tasks.yaml", async () => {
    const recipeDir = join(tempDir, "my-recipe");
    await mkdir(recipeDir, { recursive: true });
    await writeFile(
      join(recipeDir, "tasks.yaml"),
      `name: my-recipe\ntitle: My Recipe\ncategory: serving\nestimated_hours: "1"\ntasks: []\n`,
    );

    const result = await listRecipes(tempDir);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "my-recipe",
      title: "My Recipe",
      category: "serving",
      estimated_hours: "1",
    });
  });

  it("lists multiple recipes", async () => {
    for (const name of ["recipe-a", "recipe-b"]) {
      const dir = join(tempDir, name);
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, "tasks.yaml"),
        `name: ${name}\ntitle: ${name}\ncategory: rag\nestimated_hours: "0.5"\ntasks: []\n`,
      );
    }

    const result = await listRecipes(tempDir);
    expect(result).toHaveLength(2);
  });
});

describe("loadRecipe", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "recipe-load-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("parses tasks.yaml and rubric.yaml into Recipe", async () => {
    await writeFile(
      join(tempDir, "tasks.yaml"),
      [
        "name: test-recipe",
        "title: Test Recipe",
        "category: serving",
        'estimated_hours: "1"',
        "tasks:",
        "  - name: step-one",
        '    description: "First step"',
        '    command: "echo hello"',
        "    timeout_seconds: 10",
      ].join("\n"),
    );

    await writeFile(
      join(tempDir, "rubric.yaml"),
      [
        "metrics:",
        "  - name: my_metric",
        '    description: "A test metric"',
        "    unit: ms",
        '    expected: "< 100"',
        'pass_criteria: "my_metric < 100"',
      ].join("\n"),
    );

    const recipe = await loadRecipe(tempDir);
    expect(recipe.name).toBe("test-recipe");
    expect(recipe.title).toBe("Test Recipe");
    expect(recipe.category).toBe("serving");
    expect(recipe.tasks).toHaveLength(1);
    expect(recipe.tasks[0].name).toBe("step-one");
    expect(recipe.tasks[0].command).toBe("echo hello");
    expect(recipe.rubric.metrics).toHaveLength(1);
    expect(recipe.rubric.pass_criteria).toBe("my_metric < 100");
  });
});
