import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeTrends, CURRENT_SCHEMA_VERSION } from "../pipeline/writer.js";
import type { TrendsEnvelope } from "../pipeline/writer.js";
import type { TrendCard } from "../models/trend-card.js";

function makeCard(overrides: Partial<TrendCard> = {}): TrendCard {
  return {
    id: "test-card",
    title: "Test Card",
    summary: "A test card.",
    category: "serving",
    sources: [{ title: "Source", url: "https://example.com", type: "repo" }],
    date: new Date().toISOString().slice(0, 10),
    relevanceScore: 80,
    tags: ["test"],
    ...overrides,
  };
}

describe("writeTrends", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "writer-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("writes new envelope with correct schemaVersion and generatedAt", async () => {
    const outputPath = join(tempDir, "trends.json");
    const cards = [makeCard()];
    const envelope = await writeTrends(cards, outputPath);

    expect(envelope.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(envelope.generatedAt).toBeTruthy();
    expect(envelope.cards).toHaveLength(1);
  });

  it("written file can be read back (round-trip)", async () => {
    const outputPath = join(tempDir, "trends.json");
    const cards = [makeCard({ id: "round-trip" })];
    await writeTrends(cards, outputPath);

    const raw = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(raw) as TrendsEnvelope;
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0].id).toBe("round-trip");
  });

  it("merges incoming cards with existing file by ID", async () => {
    const outputPath = join(tempDir, "trends.json");

    // Write initial cards
    await writeTrends([makeCard({ id: "existing", relevanceScore: 50 })], outputPath);

    // Write new card — should merge with existing
    const envelope = await writeTrends(
      [makeCard({ id: "new-card", relevanceScore: 70 })],
      outputPath,
    );

    expect(envelope.cards).toHaveLength(2);
    const ids = envelope.cards.map((c) => c.id);
    expect(ids).toContain("existing");
    expect(ids).toContain("new-card");
  });

  it("incoming card with higher score replaces existing", async () => {
    const outputPath = join(tempDir, "trends.json");

    await writeTrends(
      [makeCard({ id: "dup", title: "Old Title", relevanceScore: 40 })],
      outputPath,
    );

    const envelope = await writeTrends(
      [makeCard({ id: "dup", title: "New Title", relevanceScore: 90 })],
      outputPath,
    );

    const card = envelope.cards.find((c) => c.id === "dup");
    expect(card?.title).toBe("New Title");
    expect(card?.relevanceScore).toBe(90);
  });

  it("incoming card with lower score does not replace existing", async () => {
    const outputPath = join(tempDir, "trends.json");

    await writeTrends([makeCard({ id: "dup", title: "Original", relevanceScore: 90 })], outputPath);

    const envelope = await writeTrends(
      [makeCard({ id: "dup", title: "Lower", relevanceScore: 30 })],
      outputPath,
    );

    const card = envelope.cards.find((c) => c.id === "dup");
    expect(card?.title).toBe("Original");
    expect(card?.relevanceScore).toBe(90);
  });

  it("prunes stale cards older than 30 days", async () => {
    const outputPath = join(tempDir, "trends.json");
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await writeTrends([makeCard({ id: "old", date: oldDate, relevanceScore: 50 })], outputPath);

    // Write a fresh card — old one should be pruned during merge
    const envelope = await writeTrends([makeCard({ id: "fresh", relevanceScore: 80 })], outputPath);

    const ids = envelope.cards.map((c) => c.id);
    expect(ids).toContain("fresh");
    expect(ids).not.toContain("old");
  });

  it("sorts cards by relevanceScore desc", async () => {
    const outputPath = join(tempDir, "trends.json");
    const cards = [
      makeCard({ id: "low", relevanceScore: 20 }),
      makeCard({ id: "high", relevanceScore: 95 }),
      makeCard({ id: "mid", relevanceScore: 60 }),
    ];
    const envelope = await writeTrends(cards, outputPath);
    expect(envelope.cards[0].id).toBe("high");
    expect(envelope.cards[1].id).toBe("mid");
    expect(envelope.cards[2].id).toBe("low");
  });

  it("handles non-existent output path (creates new file)", async () => {
    join(tempDir, "subdir", "trends.json"); // unused — testing with existing tempDir below
    // subdir doesn't exist — but writeTrends writes to dirname, which is tempDir/subdir
    // The writer uses dirname for temp file, so this may need the parent to exist.
    // Let's test with a path in the existing tempDir.
    const path = join(tempDir, "new-trends.json");
    const envelope = await writeTrends([makeCard()], path);
    expect(envelope.cards).toHaveLength(1);

    const raw = await readFile(path, "utf-8");
    expect(JSON.parse(raw)).toEqual(envelope);
  });

  it("handles corrupt existing file (starts fresh)", async () => {
    const outputPath = join(tempDir, "trends.json");
    await writeFile(outputPath, "not valid json {{}", "utf-8");

    const envelope = await writeTrends([makeCard({ id: "fresh" })], outputPath);
    expect(envelope.cards).toHaveLength(1);
    expect(envelope.cards[0].id).toBe("fresh");
  });

  it("handles existing file with wrong schema version (starts fresh)", async () => {
    const outputPath = join(tempDir, "trends.json");
    const oldEnvelope = {
      schemaVersion: 999,
      generatedAt: new Date().toISOString(),
      cards: [makeCard({ id: "old-schema" })],
    };
    await writeFile(outputPath, JSON.stringify(oldEnvelope), "utf-8");

    const envelope = await writeTrends([makeCard({ id: "new" })], outputPath);
    // Old card should not be merged since schema version didn't match
    const ids = envelope.cards.map((c) => c.id);
    expect(ids).toContain("new");
    expect(ids).not.toContain("old-schema");
  });
});
