import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import {
  copyScaffold,
  runRecipe,
  loadRecipe,
  generateReport,
  findLocalRecipesDir,
  resolveRecipeList,
  resolveRecipeDir,
} from "trend2trial-core";

export async function recipeList(root: string | undefined): Promise<void> {
  const localRecipesDir = findLocalRecipesDir(root);
  const recipes = await resolveRecipeList({ localRecipesDir });

  if (recipes.length === 0) {
    console.log("No recipes found.");
    return;
  }

  console.log("");
  console.log("Available recipes:");
  console.log("");
  console.log(
    "Name".padEnd(35) +
      "Category".padEnd(12) +
      "Hours".padEnd(8) +
      "Title",
  );
  console.log("-".repeat(80));
  for (const r of recipes) {
    console.log(
      r.name.padEnd(35) +
        r.category.padEnd(12) +
        r.estimated_hours.padEnd(8) +
        r.title,
    );
  }
  console.log("");
}

export async function recipeInit(
  root: string | undefined,
  name: string,
  dest: string,
): Promise<void> {
  const localRecipesDir = findLocalRecipesDir(root);
  const recipeDir = await resolveRecipeDir(name, { localRecipesDir });
  const absDest = resolve(dest);

  await copyScaffold(recipeDir, absDest);
  console.log(`Recipe "${name}" initialized at ${absDest}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${absDest}`);
  console.log(`  trend2trial recipe run ${absDest}`);
}

export async function recipeRun(dest: string): Promise<void> {
  const absDest = resolve(dest);
  console.log(`Running recipe in ${absDest}...`);
  console.log("");

  const result = await runRecipe(absDest);

  for (const step of result.steps) {
    const status = step.exitCode === 0 ? "OK" : "FAIL";
    console.log(`  [${status}] ${step.name} (${step.durationMs}ms)`);
    if (step.exitCode !== 0 && step.stderr) {
      console.log(`       stderr: ${step.stderr.slice(0, 200)}`);
    }
  }

  console.log("");

  const recipe = await loadRecipe(absDest);
  const report = generateReport(recipe, result);
  const reportPath = resolve(absDest, "REPORT.md");
  await writeFile(reportPath, report, "utf-8");
  console.log(`Report written to ${reportPath}`);
}
