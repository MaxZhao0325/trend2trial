import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_BIN = resolve(__dirname, "../../bin/trend2trial.js");

function run(
  args: string[],
  timeoutMs = 10000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((res) => {
    const child = execFile(
      "node",
      [CLI_BIN, ...args],
      { timeout: timeoutMs, env: { ...process.env, NO_COLOR: "1" } },
      (error, stdout, stderr) => {
        const exitCode = error ? child.exitCode ?? 1 : 0;
        res({ stdout, stderr, exitCode });
      },
    );
  });
}

describe("CLI --version", () => {
  it("prints version string and exits 0", async () => {
    const { stdout, exitCode } = await run(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/^trend2trial v\d+\.\d+\.\d+/);
  });

  it("also works with -v short flag", async () => {
    const { stdout, exitCode } = await run(["-v"]);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/^trend2trial v/);
  });
});

describe("CLI --help", () => {
  it("prints help text and exits 0", async () => {
    const { stdout, exitCode } = await run(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("trend2trial");
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("Commands:");
    expect(stdout).toContain("build");
    expect(stdout).toContain("recipe");
    expect(stdout).toContain("trends");
  });

  it("also works with -h short flag", async () => {
    const { stdout, exitCode } = await run(["-h"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
  });

  it("shows help when called with no arguments", async () => {
    const { stdout, exitCode } = await run([]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
  });
});

describe("CLI unknown command", () => {
  it("exits with code 2 for unknown command", async () => {
    const { exitCode, stderr } = await run(["foobar"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Unknown command: foobar");
  });

  it("suggests similar command on typo", async () => {
    const { exitCode, stderr } = await run(["bild"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Did you mean");
    expect(stderr).toContain("build");
  });

  it("exits with code 2 for unknown recipe subcommand", async () => {
    const { exitCode, stderr } = await run(["recipe", "foobar"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Unknown recipe subcommand: foobar");
  });

  it("suggests similar recipe subcommand on typo", async () => {
    const { exitCode, stderr } = await run(["recipe", "lst"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Did you mean");
    expect(stderr).toContain("list");
  });
});

describe("CLI recipe list", () => {
  it("lists available recipes", async () => {
    const { stdout, exitCode } = await run(["recipe", "list"]);
    expect(exitCode).toBe(0);
    // Should show at least the known recipes from local repo
    expect(stdout).toContain("serving-latency");
  });
});

describe("CLI recipe init — validation", () => {
  it("exits with code 2 when name is missing", async () => {
    const { exitCode, stderr } = await run(["recipe", "init"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Missing arguments");
  });

  it("exits with code 2 when dest is missing", async () => {
    const { exitCode, stderr } = await run(["recipe", "init", "serving-latency"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Missing arguments");
  });

  it("exits with code 2 for invalid recipe name", async () => {
    const { exitCode, stderr } = await run(["recipe", "init", "INVALID_NAME!", "/tmp/test"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Invalid recipe name");
  });
});

describe("CLI recipe run — validation", () => {
  it("exits with code 2 when dest is missing", async () => {
    const { exitCode, stderr } = await run(["recipe", "run"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Missing argument");
  });
});

describe("CLI trends — validation", () => {
  it("exits with code 2 for unknown trends subcommand", async () => {
    const { exitCode, stderr } = await run(["trends", "foobar"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Unknown trends subcommand: foobar");
  });

  it("exits with code 2 when no subcommand given", async () => {
    const { exitCode, stderr } = await run(["trends"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Unknown trends subcommand: (none)");
  });
});
