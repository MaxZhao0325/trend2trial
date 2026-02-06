import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadRecipe } from "../recipes/loader.js";

function writeTasks(dir: string, content: string): Promise<void> {
  return writeFile(join(dir, "tasks.yaml"), content, "utf-8");
}

function writeRubric(dir: string, content: string): Promise<void> {
  return writeFile(join(dir, "rubric.yaml"), content, "utf-8");
}

const VALID_TASKS = [
  "name: test-recipe",
  "title: Test Recipe",
  "category: serving",
  'estimated_hours: "1"',
  "tasks:",
  "  - name: step-one",
  '    description: "First step"',
  '    command: "echo hello"',
  "    timeout_seconds: 10",
].join("\n");

const VALID_RUBRIC = [
  "metrics:",
  "  - name: latency",
  '    description: "Request latency"',
  "    unit: ms",
  'pass_criteria: "latency < 100ms"',
].join("\n");

describe("tasks.yaml validation", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "yaml-tasks-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("passes for valid tasks.yaml", async () => {
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, VALID_RUBRIC);
    const recipe = await loadRecipe(tempDir);
    expect(recipe.name).toBe("test-recipe");
    expect(recipe.title).toBe("Test Recipe");
    expect(recipe.category).toBe("serving");
    expect(recipe.tasks).toHaveLength(1);
  });

  it("throws for missing name", async () => {
    const yaml = [
      "title: Test Recipe",
      "category: serving",
      "tasks:",
      "  - name: step-one",
      '    description: "First step"',
      '    command: "echo hello"',
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("missing or invalid 'name'");
  });

  it("throws for empty name", async () => {
    const yaml = [
      'name: ""',
      "title: Test Recipe",
      "category: serving",
      "tasks:",
      "  - name: step-one",
      '    description: "First step"',
      '    command: "echo hello"',
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("missing or invalid 'name'");
  });

  it("throws for missing title", async () => {
    const yaml = [
      "name: test-recipe",
      "category: serving",
      "tasks:",
      "  - name: step-one",
      '    description: "First step"',
      '    command: "echo hello"',
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("missing or invalid 'title'");
  });

  it("throws for missing category", async () => {
    const yaml = [
      "name: test-recipe",
      "title: Test Recipe",
      "tasks:",
      "  - name: step-one",
      '    description: "First step"',
      '    command: "echo hello"',
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("'category' must be one of");
  });

  it("throws for invalid category", async () => {
    const yaml = [
      "name: test-recipe",
      "title: Test Recipe",
      "category: invalid-category",
      "tasks:",
      "  - name: step-one",
      '    description: "First step"',
      '    command: "echo hello"',
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("'category' must be one of");
  });

  it("accepts all valid categories", async () => {
    for (const category of ["serving", "rag", "llmops"]) {
      const dir = await mkdtemp(join(tmpdir(), "yaml-cat-"));
      const yaml = [
        "name: test-recipe",
        "title: Test Recipe",
        `category: ${category}`,
        "tasks:",
        "  - name: step-one",
        '    description: "First step"',
        '    command: "echo hello"',
      ].join("\n");
      await writeTasks(dir, yaml);
      await writeRubric(dir, VALID_RUBRIC);
      const recipe = await loadRecipe(dir);
      expect(recipe.category).toBe(category);
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("throws for missing tasks array", async () => {
    const yaml = [
      "name: test-recipe",
      "title: Test Recipe",
      "category: serving",
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("'tasks' must be a non-empty array");
  });

  it("throws for empty tasks array", async () => {
    const yaml = [
      "name: test-recipe",
      "title: Test Recipe",
      "category: serving",
      "tasks: []",
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("'tasks' must be a non-empty array");
  });

  it("throws for task missing name", async () => {
    const yaml = [
      "name: test-recipe",
      "title: Test Recipe",
      "category: serving",
      "tasks:",
      '  - description: "A step"',
      '    command: "echo hello"',
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("task[0] missing 'name'");
  });

  it("throws for task missing description", async () => {
    const yaml = [
      "name: test-recipe",
      "title: Test Recipe",
      "category: serving",
      "tasks:",
      "  - name: step-one",
      '    command: "echo hello"',
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("task[0] missing 'description'");
  });

  it("throws for task missing command", async () => {
    const yaml = [
      "name: test-recipe",
      "title: Test Recipe",
      "category: serving",
      "tasks:",
      "  - name: step-one",
      '    description: "A step"',
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("task[0] missing 'command'");
  });

  it("throws for non-numeric timeout_seconds", async () => {
    const yaml = [
      "name: test-recipe",
      "title: Test Recipe",
      "category: serving",
      "tasks:",
      "  - name: step-one",
      '    description: "A step"',
      '    command: "echo hello"',
      '    timeout_seconds: "not-a-number"',
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("'timeout_seconds' must be a number");
  });

  it("allows missing timeout_seconds (optional)", async () => {
    const yaml = [
      "name: test-recipe",
      "title: Test Recipe",
      "category: serving",
      "tasks:",
      "  - name: step-one",
      '    description: "A step"',
      '    command: "echo hello"',
    ].join("\n");
    await writeTasks(tempDir, yaml);
    await writeRubric(tempDir, VALID_RUBRIC);
    const recipe = await loadRecipe(tempDir);
    expect(recipe.tasks[0].timeout_seconds).toBeUndefined();
  });

  it("throws for null tasks.yaml content", async () => {
    await writeTasks(tempDir, "null");
    await writeRubric(tempDir, VALID_RUBRIC);
    await expect(loadRecipe(tempDir)).rejects.toThrow("expected an object");
  });
});

describe("rubric.yaml validation", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "yaml-rubric-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("passes for valid rubric.yaml", async () => {
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, VALID_RUBRIC);
    const recipe = await loadRecipe(tempDir);
    expect(recipe.rubric.metrics).toHaveLength(1);
    expect(recipe.rubric.pass_criteria).toBe("latency < 100ms");
  });

  it("throws for null rubric.yaml content", async () => {
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, "null");
    await expect(loadRecipe(tempDir)).rejects.toThrow("Invalid rubric.yaml: expected an object");
  });

  it("throws for missing metrics array", async () => {
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, 'pass_criteria: "all pass"');
    await expect(loadRecipe(tempDir)).rejects.toThrow("'metrics' must be an array");
  });

  it("throws for null metric entry", async () => {
    const rubric = [
      "metrics:",
      "  - null",
      'pass_criteria: "all pass"',
    ].join("\n");
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, rubric);
    await expect(loadRecipe(tempDir)).rejects.toThrow("metric[0] must be an object");
  });

  it("throws for metric missing name", async () => {
    const rubric = [
      "metrics:",
      '  - description: "A metric"',
      "    unit: ms",
      'pass_criteria: "all pass"',
    ].join("\n");
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, rubric);
    await expect(loadRecipe(tempDir)).rejects.toThrow("metric[0] missing 'name'");
  });

  it("throws for metric missing description", async () => {
    const rubric = [
      "metrics:",
      "  - name: latency",
      "    unit: ms",
      'pass_criteria: "all pass"',
    ].join("\n");
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, rubric);
    await expect(loadRecipe(tempDir)).rejects.toThrow("metric[0] missing 'description'");
  });

  it("throws for metric missing unit", async () => {
    const rubric = [
      "metrics:",
      "  - name: latency",
      '    description: "Request latency"',
      'pass_criteria: "all pass"',
    ].join("\n");
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, rubric);
    await expect(loadRecipe(tempDir)).rejects.toThrow("metric[0] missing 'unit'");
  });

  it("throws for missing pass_criteria", async () => {
    const rubric = [
      "metrics:",
      "  - name: latency",
      '    description: "Request latency"',
      "    unit: ms",
    ].join("\n");
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, rubric);
    await expect(loadRecipe(tempDir)).rejects.toThrow("missing 'pass_criteria'");
  });

  it("throws for empty pass_criteria", async () => {
    const rubric = [
      "metrics:",
      "  - name: latency",
      '    description: "Request latency"',
      "    unit: ms",
      'pass_criteria: ""',
    ].join("\n");
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, rubric);
    await expect(loadRecipe(tempDir)).rejects.toThrow("missing 'pass_criteria'");
  });

  it("allows empty metrics array", async () => {
    const rubric = [
      "metrics: []",
      'pass_criteria: "manual review"',
    ].join("\n");
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, rubric);
    const recipe = await loadRecipe(tempDir);
    expect(recipe.rubric.metrics).toHaveLength(0);
  });

  it("allows multiple metrics", async () => {
    const rubric = [
      "metrics:",
      "  - name: latency",
      '    description: "Request latency"',
      "    unit: ms",
      "  - name: throughput",
      '    description: "Requests per second"',
      "    unit: rps",
      'pass_criteria: "latency < 100 and throughput > 50"',
    ].join("\n");
    await writeTasks(tempDir, VALID_TASKS);
    await writeRubric(tempDir, rubric);
    const recipe = await loadRecipe(tempDir);
    expect(recipe.rubric.metrics).toHaveLength(2);
    expect(recipe.rubric.metrics[0].name).toBe("latency");
    expect(recipe.rubric.metrics[1].name).toBe("throughput");
  });
});
