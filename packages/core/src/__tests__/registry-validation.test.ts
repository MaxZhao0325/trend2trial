import { describe, it, expect } from "vitest";
import { validateRegistry } from "../recipes/fetcher.js";

function validRegistry() {
  return {
    schemaVersion: 1,
    updatedAt: "2026-01-01",
    recipes: [
      {
        name: "test-recipe",
        title: "Test Recipe",
        category: "serving",
        estimated_hours: "0.5",
        version: "0.1.0",
        files: ["tasks.yaml"],
      },
    ],
  };
}

describe("validateRegistry", () => {
  it("passes for a valid registry", () => {
    const result = validateRegistry(validRegistry());
    expect(result.schemaVersion).toBe(1);
    expect(result.recipes).toHaveLength(1);
  });

  it("passes for registry with checksummed files", () => {
    const reg = validRegistry();
    reg.recipes[0].files = [
      { path: "tasks.yaml", sha256: "abc123" },
    ] as unknown as string[];
    const result = validateRegistry(reg);
    expect(result.recipes[0].files).toHaveLength(1);
  });

  it("throws for null input", () => {
    expect(() => validateRegistry(null)).toThrow("expected an object");
  });

  it("throws for non-object input", () => {
    expect(() => validateRegistry("string")).toThrow("expected an object");
  });

  it("throws for undefined input", () => {
    expect(() => validateRegistry(undefined)).toThrow("expected an object");
  });

  it("throws for missing schemaVersion", () => {
    const reg = validRegistry();
    delete (reg as Record<string, unknown>).schemaVersion;
    expect(() => validateRegistry(reg)).toThrow("missing or invalid schemaVersion");
  });

  it("throws for non-numeric schemaVersion", () => {
    const reg = { ...validRegistry(), schemaVersion: "1" };
    expect(() => validateRegistry(reg)).toThrow("missing or invalid schemaVersion");
  });

  it("throws for unsupported schemaVersion", () => {
    const reg = { ...validRegistry(), schemaVersion: 999 };
    expect(() => validateRegistry(reg)).toThrow("Unsupported registry schemaVersion");
  });

  it("throws for missing recipes field", () => {
    const reg = validRegistry();
    delete (reg as Record<string, unknown>).recipes;
    expect(() => validateRegistry(reg)).toThrow("recipes must be a non-empty array");
  });

  it("throws for empty recipes array", () => {
    const reg = { ...validRegistry(), recipes: [] };
    expect(() => validateRegistry(reg)).toThrow("recipes must be a non-empty array");
  });

  it("throws for non-array recipes", () => {
    const reg = { ...validRegistry(), recipes: "not-array" };
    expect(() => validateRegistry(reg)).toThrow("recipes must be a non-empty array");
  });

  it("throws for null recipe entry", () => {
    const reg = { ...validRegistry(), recipes: [null] };
    expect(() => validateRegistry(reg)).toThrow("expected an object");
  });

  it("throws for recipe entry missing name", () => {
    const reg = validRegistry();
    delete (reg.recipes[0] as Record<string, unknown>).name;
    expect(() => validateRegistry(reg)).toThrow('missing or invalid "name"');
  });

  it("throws for recipe entry with empty name", () => {
    const reg = validRegistry();
    reg.recipes[0].name = "";
    expect(() => validateRegistry(reg)).toThrow('missing or invalid "name"');
  });

  it("throws for recipe entry missing title", () => {
    const reg = validRegistry();
    delete (reg.recipes[0] as Record<string, unknown>).title;
    expect(() => validateRegistry(reg)).toThrow('missing or invalid "title"');
  });

  it("throws for recipe entry missing category", () => {
    const reg = validRegistry();
    delete (reg.recipes[0] as Record<string, unknown>).category;
    expect(() => validateRegistry(reg)).toThrow('missing or invalid "category"');
  });

  it("throws for recipe entry missing version", () => {
    const reg = validRegistry();
    delete (reg.recipes[0] as Record<string, unknown>).version;
    expect(() => validateRegistry(reg)).toThrow('missing or invalid "version"');
  });

  it("throws for recipe entry with empty files array", () => {
    const reg = validRegistry();
    reg.recipes[0].files = [];
    expect(() => validateRegistry(reg)).toThrow("files must be a non-empty array");
  });

  it("throws for recipe entry with invalid file entry", () => {
    const reg = validRegistry();
    reg.recipes[0].files = [42 as unknown as string];
    expect(() => validateRegistry(reg)).toThrow("invalid file entry");
  });

  it("accepts multiple valid recipes", () => {
    const reg = validRegistry();
    reg.recipes.push({
      name: "second-recipe",
      title: "Second Recipe",
      category: "rag",
      estimated_hours: "1",
      version: "0.2.0",
      files: ["tasks.yaml", "rubric.yaml"],
    });
    const result = validateRegistry(reg);
    expect(result.recipes).toHaveLength(2);
  });
});
