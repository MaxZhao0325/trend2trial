import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { writeFile } from "node:fs/promises";
import {
  copyScaffold,
  runRecipe,
  loadRecipe,
  generateReport,
  findLocalRecipesDir,
  resolveRecipeList,
  resolveRecipeDir,
  previewCommands,
} from "trend2trial-core";
import {
  EXIT_RECIPE_FAIL,
  pathStr,
  success,
  error,
  header,
  dim,
  categoryBadge,
  exitWithUsageError,
  createSpinner,
} from "../ui.js";

const RECIPE_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

export async function recipeList(root: string | undefined): Promise<void> {
  const localRecipesDir = findLocalRecipesDir(root);
  const recipes = await resolveRecipeList({ localRecipesDir });

  if (recipes.length === 0) {
    console.log("No recipes found.");
    return;
  }

  console.log("");
  console.log(header("Available recipes:"));
  console.log("");
  console.log(
    header("Name".padEnd(35)) +
      header("Category".padEnd(12)) +
      header("Hours".padEnd(8)) +
      header("Title"),
  );
  console.log(dim("-".repeat(80)));
  for (const r of recipes) {
    console.log(
      r.name.padEnd(35) +
        categoryBadge(r.category).padEnd(
          12 + (categoryBadge(r.category).length - r.category.length),
        ) +
        dim(r.estimated_hours).padEnd(
          8 + (dim(r.estimated_hours).length - r.estimated_hours.length),
        ) +
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
  if (!RECIPE_NAME_RE.test(name)) {
    exitWithUsageError(
      `Invalid recipe name "${name}". Names must match [a-z0-9-] (e.g. "serving-latency").`,
    );
  }

  const absDest = resolve(dest);
  if (absDest.includes("\0")) {
    exitWithUsageError(`Invalid destination path: "${dest}"`);
  }

  const localRecipesDir = findLocalRecipesDir(root);
  const recipeDir = await resolveRecipeDir(name, { localRecipesDir });

  await copyScaffold(recipeDir, absDest);
  console.log(success(`Recipe "${name}" initialized at ${pathStr(absDest)}`));
  console.log("");
  console.log(header("Next steps:"));
  console.log(`  cd ${pathStr(absDest)}`);
  console.log(`  trend2trial recipe run ${pathStr(absDest)}`);
}

function askConfirmation(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

export interface RecipeRunFlags {
  yes?: boolean;
  noFailFast?: boolean;
}

export async function recipeRun(dest: string, flags: RecipeRunFlags = {}): Promise<void> {
  const absDest = resolve(dest);
  if (absDest.includes("\0")) {
    exitWithUsageError(`Invalid destination path: "${dest}"`);
  }

  const recipe = await loadRecipe(absDest);
  const commands = previewCommands(recipe);

  console.log(
    `Recipe ${header(recipe.title)} will run ${header(String(commands.length))} commands:`,
  );
  console.log("");
  for (const cmd of commands) {
    console.log(`  ${dim("$")} ${cmd}`);
  }
  console.log("");

  if (!flags.yes) {
    const confirmed = await askConfirmation("Proceed? [y/N] ");
    if (!confirmed) {
      console.log("Aborted.");
      return;
    }
    console.log("");
  }

  const spinner = createSpinner("Running recipe steps...");
  const result = await runRecipe(absDest, {
    confirmed: true,
    failFast: !flags.noFailFast,
  });
  spinner.stop();

  let hasFailure = false;
  for (const step of result.steps) {
    if (step.exitCode === 0) {
      console.log(`  ${success("[OK]")}   ${header(step.name)} ${dim(`(${step.durationMs}ms)`)}`);
    } else {
      hasFailure = true;
      console.log(`  ${error("[FAIL]")} ${header(step.name)} ${dim(`(${step.durationMs}ms)`)}`);
      if (step.stderr) {
        console.log(`         ${dim("stderr:")} ${step.stderr.slice(0, 200)}`);
      }
    }
  }

  console.log("");

  const report = generateReport(recipe, result);
  const reportPath = resolve(absDest, "REPORT.md");
  await writeFile(reportPath, report, "utf-8");
  console.log(`Report written to ${pathStr(reportPath)}`);

  if (hasFailure) {
    process.exit(EXIT_RECIPE_FAIL);
  }
}
