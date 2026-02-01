import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRecipe } from "./loader.js";
import type { RunResult, StepResult } from "../models/recipe.js";

function execStep(
  command: string,
  cwd: string,
  timeoutMs: number,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = execFile(
      "sh",
      ["-c", command],
      { cwd, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const exitCode = error ? (error as NodeJS.ErrnoException & { code?: number | string }).code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"
          ? 1
          : child.exitCode ?? 1
          : 0;
        resolve({ exitCode: typeof exitCode === "number" ? exitCode : 1, stdout, stderr });
      },
    );
  });
}

export async function runRecipe(dest: string): Promise<RunResult> {
  const recipe = await loadRecipe(dest);
  const startedAt = new Date().toISOString();
  const steps: StepResult[] = [];

  for (const task of recipe.tasks) {
    const timeoutMs = (task.timeout_seconds ?? 60) * 1000;
    const start = Date.now();
    const { exitCode, stdout, stderr } = await execStep(task.command, dest, timeoutMs);
    const durationMs = Date.now() - start;

    steps.push({
      name: task.name,
      exitCode,
      stdout,
      stderr,
      durationMs,
    });
  }

  let metrics: Record<string, unknown> = {};
  try {
    const raw = await readFile(join(dest, "metrics.json"), "utf-8");
    metrics = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // metrics.json is optional
  }

  const finishedAt = new Date().toISOString();

  return {
    recipe: recipe.name,
    steps,
    metrics,
    startedAt,
    finishedAt,
  };
}
