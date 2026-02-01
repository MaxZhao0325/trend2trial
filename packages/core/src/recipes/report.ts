import { platform, arch, version as nodeVersion } from "node:process";
import type { Recipe, RunResult } from "../models/recipe.js";

export function generateReport(recipe: Recipe, result: RunResult): string {
  const lines: string[] = [];

  // 实验目的
  lines.push("# REPORT");
  lines.push("");
  lines.push("## 实验目的");
  lines.push("");
  lines.push(`**Recipe:** ${recipe.title}`);
  lines.push(`**Category:** ${recipe.category}`);
  lines.push(`**Estimated Hours:** ${recipe.estimated_hours}`);
  lines.push("");
  lines.push("Tasks:");
  for (const task of recipe.tasks) {
    lines.push(`- ${task.name}: ${task.description}`);
  }
  lines.push("");

  // 运行环境与参数
  lines.push("## 运行环境与参数");
  lines.push("");
  lines.push(`- **Platform:** ${platform} ${arch}`);
  lines.push(`- **Node.js:** ${nodeVersion}`);
  lines.push(`- **Started:** ${result.startedAt}`);
  lines.push(`- **Finished:** ${result.finishedAt}`);
  lines.push("");

  // 结果摘要
  lines.push("## 结果摘要");
  lines.push("");

  const allPassed = result.steps.every((s) => s.exitCode === 0);
  lines.push(`**Overall:** ${allPassed ? "PASS" : "FAIL"}`);
  lines.push("");

  lines.push("### Steps");
  lines.push("");
  lines.push("| Step | Exit Code | Duration |");
  lines.push("|------|-----------|----------|");
  for (const step of result.steps) {
    const status = step.exitCode === 0 ? "OK" : `FAIL(${step.exitCode})`;
    lines.push(`| ${step.name} | ${status} | ${step.durationMs}ms |`);
  }
  lines.push("");

  if (Object.keys(result.metrics).length > 0) {
    lines.push("### Metrics");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|-------|");
    for (const [key, value] of Object.entries(result.metrics)) {
      lines.push(`| ${key} | ${String(value)} |`);
    }
    lines.push("");
  }

  if (recipe.rubric.metrics.length > 0) {
    lines.push("### Rubric");
    lines.push("");
    lines.push(`**Pass Criteria:** ${recipe.rubric.pass_criteria}`);
    lines.push("");
    lines.push("| Metric | Unit | Expected |");
    lines.push("|--------|------|----------|");
    for (const m of recipe.rubric.metrics) {
      lines.push(`| ${m.name} | ${m.unit} | ${m.expected ?? "N/A"} |`);
    }
    lines.push("");
  }

  // 可复现命令
  lines.push("## 可复现命令");
  lines.push("");
  lines.push("```bash");
  for (const task of recipe.tasks) {
    lines.push(`# ${task.name}`);
    lines.push(task.command);
  }
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}
