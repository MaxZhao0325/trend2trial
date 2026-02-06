import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_BIN = resolve(__dirname, "../../bin/trend2trial.js");

function run(
  args: string[],
  timeoutMs = 30000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((res) => {
    const child = execFile(
      "node",
      [CLI_BIN, ...args],
      { timeout: timeoutMs, env: { ...process.env, NO_COLOR: "1" } },
      (error, stdout, stderr) => {
        const exitCode = error ? (child.exitCode ?? 1) : 0;
        res({ stdout, stderr, exitCode });
      },
    );
  });
}

describe("E2E: recipe init -> run -> REPORT.md", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "t2t-e2e-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("initializes, runs, and produces REPORT.md for serving-latency", async () => {
    const dest = join(tempDir, "my-trial");

    // Step 1: recipe init
    const initResult = await run(["recipe", "init", "serving-latency", dest]);
    expect(initResult.exitCode).toBe(0);
    expect(initResult.stdout).toContain("initialized at");

    // Verify scaffold was copied
    const tasksYaml = await stat(join(dest, "tasks.yaml"));
    expect(tasksYaml.isFile()).toBe(true);
    const rubricYaml = await stat(join(dest, "rubric.yaml"));
    expect(rubricYaml.isFile()).toBe(true);
    const scaffoldDir = await stat(join(dest, "scaffold"));
    expect(scaffoldDir.isDirectory()).toBe(true);

    // Step 2: recipe run with --yes (no interactive prompt)
    const runResult = await run(["recipe", "run", dest, "--yes"], 60000);
    // The recipe may or may not fully succeed depending on environment,
    // but REPORT.md should always be generated
    // exitCode 0 = all steps passed, exitCode 3 = some steps failed
    expect([0, 3]).toContain(runResult.exitCode);
    expect(runResult.stdout).toContain("Report written to");

    // Step 3: verify REPORT.md exists and has content
    const reportPath = join(dest, "REPORT.md");
    const reportStat = await stat(reportPath);
    expect(reportStat.isFile()).toBe(true);

    const reportContent = await readFile(reportPath, "utf-8");
    expect(reportContent).toContain("Serving Latency Benchmark");
    expect(reportContent).toContain("# REPORT");
  }, 90000);

  it("recipe init creates a directory with expected files", async () => {
    const dest = join(tempDir, "quick-trial");

    const result = await run(["recipe", "init", "serving-latency", dest]);
    expect(result.exitCode).toBe(0);

    // Verify key files
    const tasks = await readFile(join(dest, "tasks.yaml"), "utf-8");
    expect(tasks).toContain("serving-latency");
    expect(tasks).toContain("tasks:");

    const rubric = await readFile(join(dest, "rubric.yaml"), "utf-8");
    expect(rubric).toContain("metrics:");
    expect(rubric).toContain("pass_criteria:");
  });
});
