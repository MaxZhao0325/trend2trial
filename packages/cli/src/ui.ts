import pc from "picocolors";

/** Exit code constants following Unix conventions. */
export const EXIT_SUCCESS = 0;
export const EXIT_INTERNAL = 1;
export const EXIT_USAGE = 2;
export const EXIT_RECIPE_FAIL = 3;

/** Color a file path for terminal display. */
export function pathStr(p: string): string {
  return pc.cyan(p);
}

/** Format a success message. */
export function success(msg: string): string {
  return pc.green(msg);
}

/** Format an error message. */
export function error(msg: string): string {
  return pc.red(msg);
}

/** Format a bold header. */
export function header(msg: string): string {
  return pc.bold(msg);
}

/** Format a dim/secondary string (e.g. durations). */
export function dim(msg: string): string {
  return pc.dim(msg);
}

/** Color a category badge for terminal display. */
export function categoryBadge(category: string): string {
  switch (category) {
    case "serving":
      return pc.blue(category);
    case "rag":
      return pc.magenta(category);
    case "llmops":
      return pc.yellow(category);
    default:
      return category;
  }
}

/** Simple progress spinner for long-running operations. */
export interface Spinner {
  stop(finalMsg?: string): void;
}

const FRAMES = ["|", "/", "-", "\\"];

export function createSpinner(message: string): Spinner {
  const isTTY = process.stderr.isTTY;
  if (!isTTY) {
    process.stderr.write(`${message}\n`);
    return { stop() {} };
  }

  let frame = 0;
  const id = setInterval(() => {
    const f = FRAMES[frame % FRAMES.length];
    process.stderr.write(`\r${pc.cyan(f)} ${message}`);
    frame++;
  }, 80);

  return {
    stop(finalMsg?: string) {
      clearInterval(id);
      process.stderr.write(`\r${" ".repeat(message.length + 3)}\r`);
      if (finalMsg) process.stderr.write(`${finalMsg}\n`);
    },
  };
}

/** Print a formatted error to stderr with a red "error:" prefix. */
export function printError(msg: string): void {
  console.error(`${pc.red(pc.bold("error:"))} ${msg}`);
}

/** Print a formatted error to stderr and exit. */
export function exitWithUsageError(msg: string): never {
  printError(msg);
  process.exit(EXIT_USAGE);
}
