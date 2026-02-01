import { parseArgs } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { buildCards } from "./commands/build.js";
import { recipeList, recipeInit, recipeRun } from "./commands/recipe.js";

/**
 * Attempt to find the monorepo root (for local dev / cloned repo).
 * Returns undefined when running via npx (no local recipes/ dir).
 */
function findLocalRoot(): string | undefined {
  // CLI dist lives at packages/cli/dist — root is three levels up
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const candidate = resolve(__dirname, "../../..");
  if (existsSync(resolve(candidate, "recipes"))) {
    return candidate;
  }
  return undefined;
}

function printHelp(): void {
  console.log(`
trend2trial — Trend Radar + Trial Playground

Usage:
  trend2trial build [--input <path>] [--output <dir>]
  trend2trial recipe list
  trend2trial recipe init <name> <dest>
  trend2trial recipe run <dest>
  trend2trial --help

Commands:
  build         Read trends from JSON and generate Markdown cards
  recipe list   List available recipes
  recipe init   Initialize a recipe into a working directory
  recipe run    Run a recipe and generate REPORT.md

Options:
  --input   Path to trends JSON file (default: data/sample.json)
  --output  Output directory for cards (default: docs/cards)
  --help    Show this help message
`);
}

async function main(): Promise<void> {
  const root = findLocalRoot();

  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      input: {
        type: "string",
        default: root ? resolve(root, "data/sample.json") : "data/sample.json",
      },
      output: {
        type: "string",
        default: root ? resolve(root, "docs/cards") : "docs/cards",
      },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help || positionals.length === 0) {
    printHelp();
    process.exit(0);
  }

  const command = positionals[0];

  switch (command) {
    case "build":
      await buildCards(values.input as string, values.output as string);
      break;
    case "recipe": {
      const sub = positionals[1];
      switch (sub) {
        case "list":
          await recipeList(root);
          break;
        case "init": {
          const name = positionals[2];
          const dest = positionals[3];
          if (!name || !dest) {
            console.error("Usage: trend2trial recipe init <name> <dest>");
            process.exit(1);
          }
          await recipeInit(root, name, dest);
          break;
        }
        case "run": {
          const runDest = positionals[2];
          if (!runDest) {
            console.error("Usage: trend2trial recipe run <dest>");
            process.exit(1);
          }
          await recipeRun(runDest);
          break;
        }
        default:
          console.error(`Unknown recipe subcommand: ${sub}`);
          printHelp();
          process.exit(1);
      }
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
