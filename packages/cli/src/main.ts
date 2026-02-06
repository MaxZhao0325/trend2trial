import { parseArgs } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { buildCards } from "./commands/build.js";
import { recipeList, recipeInit, recipeRun } from "./commands/recipe.js";
import { trendsFetch } from "./commands/trends.js";
import pc from "picocolors";
import { EXIT_SUCCESS, EXIT_INTERNAL, EXIT_USAGE, header, dim, printError } from "./ui.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Read CLI version from package.json at build-relative path. */
function getVersion(): string {
  const pkgPath = resolve(__dirname, "../package.json");
  try {
    const raw = readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as { version: string };
    return pkg.version;
  } catch {
    return "unknown";
  }
}

/**
 * Attempt to find the monorepo root (for local dev / cloned repo).
 * Returns undefined when running via npx (no local recipes/ dir).
 */
function findLocalRoot(): string | undefined {
  // CLI dist lives at packages/cli/dist — root is three levels up
  const candidate = resolve(__dirname, "../../..");
  if (existsSync(resolve(candidate, "recipes"))) {
    return candidate;
  }
  return undefined;
}

const KNOWN_COMMANDS = ["build", "recipe", "trends"];
const KNOWN_RECIPE_SUBS = ["list", "init", "run"];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function suggest(input: string, candidates: string[]): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(input, c);
    if (d < bestDist && d <= 3) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

function printHelp(): void {
  console.log(`
${header("trend2trial")} ${dim("— Trend Radar + Trial Playground")}

${header("Usage:")}
  trend2trial ${pc.cyan("build")} [--input <path>] [--output <dir>]
  trend2trial ${pc.cyan("recipe list")}
  trend2trial ${pc.cyan("recipe init")} <name> <dest>
  trend2trial ${pc.cyan("recipe run")} <dest> [--yes] [--no-fail-fast]
  trend2trial ${pc.cyan("trends fetch")} [--json] [--output <path>]
  trend2trial ${pc.cyan("--help")} | ${pc.cyan("--version")}

${header("Commands:")}
  ${pc.cyan("build")}          Read trends from JSON and generate Markdown cards
  ${pc.cyan("recipe list")}    List available recipes
  ${pc.cyan("recipe init")}    Initialize a recipe into a working directory
  ${pc.cyan("recipe run")}     Run a recipe and generate REPORT.md
  ${pc.cyan("trends fetch")}   Fetch latest trends from all adapters

${header("Options:")}
  --input       Path to trends JSON file ${dim("(default: data/sample.json)")}
  --output      Output directory for cards ${dim("(default: docs/cards)")}
  --json        Output trends as JSON ${dim("(trends fetch only)")}
  --yes, -y     Skip confirmation prompt for recipe run
  --no-fail-fast Continue running steps after a failure
  --help, -h    Show this help message
  --version, -v Show version number
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
      json: { type: "boolean", default: false },
      yes: { type: "boolean", short: "y", default: false },
      "no-fail-fast": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  });

  if (values.version) {
    console.log(`trend2trial v${getVersion()}`);
    process.exit(EXIT_SUCCESS);
  }

  if (values.help || positionals.length === 0) {
    printHelp();
    process.exit(EXIT_SUCCESS);
  }

  const command = positionals[0];

  switch (command) {
    case "build":
      await buildCards(values.input as string, values.output as string);
      break;
    case "trends": {
      const sub = positionals[1];
      if (sub !== "fetch") {
        printError(`Unknown trends subcommand: ${sub ?? "(none)"}`);
        console.error(`\n  Usage: trend2trial trends fetch [--json] [--output <path>]\n`);
        process.exit(EXIT_USAGE);
      }
      await trendsFetch({
        json: values.json,
        output: process.argv.includes("--output") ? (values.output as string) : undefined,
      });
      break;
    }
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
            printError("Missing arguments for recipe init");
            console.error(`\n  Usage: trend2trial recipe init <name> <dest>\n`);
            process.exit(EXIT_USAGE);
          }
          await recipeInit(root, name, dest);
          break;
        }
        case "run": {
          const runDest = positionals[2];
          if (!runDest) {
            printError("Missing argument for recipe run");
            console.error(`\n  Usage: trend2trial recipe run <dest>\n`);
            process.exit(EXIT_USAGE);
          }
          await recipeRun(runDest, {
            yes: values.yes,
            noFailFast: values["no-fail-fast"],
          });
          break;
        }
        default: {
          const hint = sub ? suggest(sub, KNOWN_RECIPE_SUBS) : undefined;
          printError(`Unknown recipe subcommand: ${sub ?? "(none)"}`);
          if (hint) console.error(`  Did you mean ${pc.cyan(`recipe ${hint}`)}?\n`);
          printHelp();
          process.exit(EXIT_USAGE);
        }
      }
      break;
    }
    default: {
      const hint = suggest(command, KNOWN_COMMANDS);
      printError(`Unknown command: ${command}`);
      if (hint) console.error(`  Did you mean ${pc.cyan(hint)}?\n`);
      printHelp();
      process.exit(EXIT_USAGE);
    }
  }
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    printError(err.message);
    if (process.env["DEBUG"]) {
      console.error(dim(err.stack ?? ""));
    }
  } else {
    printError(String(err));
  }
  process.exit(EXIT_INTERNAL);
});
