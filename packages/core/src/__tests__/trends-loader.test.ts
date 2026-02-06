import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadTrendsFromDir, loadTrendsFromFile } from "../trends/loader.js";

function validCardJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: "test-card",
    title: "Test Card",
    summary: "A valid test card.",
    category: "serving",
    sources: [{ title: "Source", url: "https://example.com", type: "repo" }],
    date: "2025-01-01",
    relevanceScore: 80,
    tags: ["test"],
    ...overrides,
  });
}

describe("loadTrendsFromDir", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "loader-dir-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns empty array for non-existent directory", async () => {
    const result = await loadTrendsFromDir(join(tempDir, "nonexistent"));
    expect(result).toEqual([]);
  });

  it("returns empty array for empty directory", async () => {
    const result = await loadTrendsFromDir(tempDir);
    expect(result).toEqual([]);
  });

  it("loads valid JSON card files sorted by relevanceScore desc", async () => {
    await writeFile(
      join(tempDir, "low.json"),
      validCardJson({ id: "low", title: "Low Score", relevanceScore: 30 }),
    );
    await writeFile(
      join(tempDir, "high.json"),
      validCardJson({ id: "high", title: "High Score", relevanceScore: 90 }),
    );

    const result = await loadTrendsFromDir(tempDir);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("High Score");
    expect(result[1].title).toBe("Low Score");
  });

  it("skips malformed JSON files", async () => {
    await writeFile(join(tempDir, "valid.json"), validCardJson());
    await writeFile(join(tempDir, "broken.json"), "{ not valid json");

    const result = await loadTrendsFromDir(tempDir);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("test-card");
  });

  it("skips cards failing validation", async () => {
    await writeFile(join(tempDir, "valid.json"), validCardJson());
    // Missing required fields
    await writeFile(
      join(tempDir, "invalid.json"),
      JSON.stringify({ id: "", title: "" }),
    );

    const result = await loadTrendsFromDir(tempDir);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("test-card");
  });

  it("filters by category option", async () => {
    await writeFile(
      join(tempDir, "serving.json"),
      validCardJson({ id: "srv", category: "serving" }),
    );
    await writeFile(
      join(tempDir, "rag.json"),
      validCardJson({ id: "rag-card", category: "rag" }),
    );

    const result = await loadTrendsFromDir(tempDir, { category: "rag" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rag-card");
  });

  it("ignores non-JSON files", async () => {
    await writeFile(join(tempDir, "valid.json"), validCardJson());
    await writeFile(join(tempDir, "readme.md"), "# Not a card");
    await writeFile(join(tempDir, "data.txt"), "text file");

    const result = await loadTrendsFromDir(tempDir);
    expect(result).toHaveLength(1);
  });
});

describe("loadTrendsFromFile", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "loader-file-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("loads array of valid cards", async () => {
    const cards = [
      JSON.parse(validCardJson({ id: "a", relevanceScore: 60 })),
      JSON.parse(validCardJson({ id: "b", relevanceScore: 90 })),
    ];
    const filePath = join(tempDir, "cards.json");
    await writeFile(filePath, JSON.stringify(cards));

    const result = await loadTrendsFromFile(filePath);
    expect(result).toHaveLength(2);
    // Sorted by relevanceScore desc
    expect(result[0].id).toBe("b");
    expect(result[1].id).toBe("a");
  });

  it("throws on non-array JSON", async () => {
    const filePath = join(tempDir, "obj.json");
    await writeFile(filePath, JSON.stringify({ id: "not-array" }));

    await expect(loadTrendsFromFile(filePath)).rejects.toThrow("Expected array");
  });

  it("skips invalid cards within array", async () => {
    const cards = [
      JSON.parse(validCardJson({ id: "valid" })),
      { id: "", title: "" }, // invalid
    ];
    const filePath = join(tempDir, "mixed.json");
    await writeFile(filePath, JSON.stringify(cards));

    const result = await loadTrendsFromFile(filePath);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("valid");
  });

  it("returns empty array for array of all invalid cards", async () => {
    const cards = [{ id: "" }, { title: "" }];
    const filePath = join(tempDir, "invalid.json");
    await writeFile(filePath, JSON.stringify(cards));

    const result = await loadTrendsFromFile(filePath);
    expect(result).toHaveLength(0);
  });
});
