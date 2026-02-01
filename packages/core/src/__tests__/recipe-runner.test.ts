import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runRecipe } from "../recipes/runner.js";
import { generateReport } from "../recipes/report.js";
import { loadRecipe } from "../recipes/loader.js";

describe("runRecipe", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "runner-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("executes recipe steps and returns results", async () => {
    await writeFile(
      join(tempDir, "tasks.yaml"),
      [
        "name: test-run",
        "title: Test Run",
        "category: serving",
        'estimated_hours: "0.5"',
        "tasks:",
        "  - name: echo-step",
        '    description: "Echo test"',
        '    command: "echo hello-world"',
        "    timeout_seconds: 5",
      ].join("\n"),
    );

    await writeFile(
      join(tempDir, "rubric.yaml"),
      [
        "metrics: []",
        'pass_criteria: "all steps pass"',
      ].join("\n"),
    );

    const result = await runRecipe(tempDir);
    expect(result.recipe).toBe("test-run");
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].exitCode).toBe(0);
    expect(result.steps[0].stdout).toContain("hello-world");
    expect(result.startedAt).toBeTruthy();
    expect(result.finishedAt).toBeTruthy();
  });

  it("captures non-zero exit codes", async () => {
    await writeFile(
      join(tempDir, "tasks.yaml"),
      [
        "name: fail-test",
        "title: Fail Test",
        "category: rag",
        'estimated_hours: "0.5"',
        "tasks:",
        "  - name: fail-step",
        '    description: "Should fail"',
        '    command: "exit 42"',
        "    timeout_seconds: 5",
      ].join("\n"),
    );

    await writeFile(
      join(tempDir, "rubric.yaml"),
      [
        "metrics: []",
        'pass_criteria: "none"',
      ].join("\n"),
    );

    const result = await runRecipe(tempDir);
    expect(result.steps[0].exitCode).not.toBe(0);
  });

  it("reads metrics.json if written by a step", async () => {
    await writeFile(
      join(tempDir, "tasks.yaml"),
      [
        "name: metrics-test",
        "title: Metrics Test",
        "category: llmops",
        'estimated_hours: "0.5"',
        "tasks:",
        "  - name: write-metrics",
        '    description: "Write metrics"',
        `    command: "echo '{\\"latency\\":42}' > metrics.json"`,
        "    timeout_seconds: 5",
      ].join("\n"),
    );

    await writeFile(
      join(tempDir, "rubric.yaml"),
      [
        "metrics: []",
        'pass_criteria: "none"',
      ].join("\n"),
    );

    const result = await runRecipe(tempDir);
    expect(result.metrics).toEqual({ latency: 42 });
  });
});

describe("generateReport", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "report-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("generates a valid REPORT.md", async () => {
    await writeFile(
      join(tempDir, "tasks.yaml"),
      [
        "name: report-test",
        "title: Report Test",
        "category: serving",
        'estimated_hours: "1"',
        "tasks:",
        "  - name: step-1",
        '    description: "Test step"',
        '    command: "echo ok"',
      ].join("\n"),
    );

    await writeFile(
      join(tempDir, "rubric.yaml"),
      [
        "metrics:",
        "  - name: test_metric",
        '    description: "A metric"',
        "    unit: ms",
        'pass_criteria: "test_metric < 100"',
      ].join("\n"),
    );

    const recipe = await loadRecipe(tempDir);
    const result = await runRecipe(tempDir);
    const report = generateReport(recipe, result);

    expect(report).toContain("# REPORT");
    expect(report).toContain("## 实验目的");
    expect(report).toContain("## 运行环境与参数");
    expect(report).toContain("## 结果摘要");
    expect(report).toContain("## 可复现命令");
    expect(report).toContain("Report Test");
    expect(report).toContain("echo ok");
  });
});
