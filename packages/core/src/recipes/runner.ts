import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRecipe } from "./loader.js";
import type { Recipe, RunOptions, RunResult, StepResult } from "../models/recipe.js";

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

const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\brm\s+(-[^\s]*)?-rf\s+\/(?:\s|$)/, reason: "destructive: rm -rf /" },
  { pattern: /\brm\s+(-[^\s]*)?-fr\s+\/(?:\s|$)/, reason: "destructive: rm -fr /" },
  { pattern: /\bcurl\b.*\|\s*(sh|bash|zsh)\b/, reason: "remote code execution: curl piped to shell" },
  { pattern: /\bwget\b.*\|\s*(sh|bash|zsh)\b/, reason: "remote code execution: wget piped to shell" },
  { pattern: /\bcurl\b.*\|\s*eval\b/, reason: "remote code execution: curl piped to eval" },
  { pattern: /\bwget\b.*\|\s*eval\b/, reason: "remote code execution: wget piped to eval" },
  { pattern: /\|\s*eval\b/, reason: "pipe to eval" },
  { pattern: /\|\s*(sh|bash|zsh)\b/, reason: "pipe to shell" },
];

const WARN_PATTERNS: RegExp[] = [
  /~\/\.ssh/,
  /~\/\.aws/,
  /\$HOME\/\.ssh/,
  /\$HOME\/\.aws/,
];

export function validateCommand(cmd: string): { safe: boolean; reason?: string; warnings?: string[] } {
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(cmd)) {
      return { safe: false, reason };
    }
  }

  const warnings: string[] = [];
  for (const pattern of WARN_PATTERNS) {
    if (pattern.test(cmd)) {
      warnings.push(`Command accesses sensitive path: ${cmd}`);
    }
  }

  return { safe: true, warnings: warnings.length > 0 ? warnings : undefined };
}

export function previewCommands(recipe: Recipe): string[] {
  return recipe.tasks.map((t) => t.command);
}

export async function runRecipe(dest: string, options: RunOptions): Promise<RunResult> {
  if (!options.confirmed) {
    throw new Error("User must confirm before running recipe commands");
  }

  const recipe = await loadRecipe(dest);
  const startedAt = new Date().toISOString();
  const steps: StepResult[] = [];

  for (const task of recipe.tasks) {
    const validation = validateCommand(task.command);
    if (!validation.safe) {
      throw new Error(`Blocked unsafe command in step "${task.name}": ${validation.reason}`);
    }

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

    if (exitCode !== 0 && options.failFast !== false) {
      break;
    }
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
