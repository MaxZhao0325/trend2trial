import { writeFile, readFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import type { TrendCard } from "../models/trend-card.js";

export const CURRENT_SCHEMA_VERSION = 1;

export interface TrendsEnvelope {
  schemaVersion: number;
  generatedAt: string;
  cards: TrendCard[];
}

const RETENTION_DAYS = 30;

function isStale(card: TrendCard, now: Date): boolean {
  const cardDate = new Date(card.date);
  const diffMs = now.getTime() - cardDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > RETENTION_DAYS;
}

function mergeCards(existing: TrendCard[], incoming: TrendCard[]): TrendCard[] {
  const byId = new Map<string, TrendCard>();

  for (const card of existing) {
    byId.set(card.id, card);
  }

  for (const card of incoming) {
    const prev = byId.get(card.id);
    if (!prev || card.relevanceScore >= prev.relevanceScore) {
      byId.set(card.id, card);
    }
  }

  const now = new Date();
  const merged: TrendCard[] = [];
  for (const card of byId.values()) {
    if (!isStale(card, now)) {
      merged.push(card);
    }
  }

  merged.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return merged;
}

async function loadExistingEnvelope(path: string): Promise<TrendsEnvelope | null> {
  try {
    const raw = await readFile(path, "utf-8");
    const data = JSON.parse(raw) as TrendsEnvelope;
    if (data.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      console.warn(
        `Existing trends file has schema version ${data.schemaVersion}, expected ${CURRENT_SCHEMA_VERSION}. Starting fresh.`,
      );
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function writeTrends(cards: TrendCard[], outputPath: string): Promise<TrendsEnvelope> {
  const existing = await loadExistingEnvelope(outputPath);
  const existingCards = existing?.cards ?? [];
  const mergedCards = mergeCards(existingCards, cards);

  const envelope: TrendsEnvelope = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    cards: mergedCards,
  };

  const json = JSON.stringify(envelope, null, 2) + "\n";

  // Atomic write: write to temp file then rename
  const tmpPath = join(dirname(outputPath), `.trends-${randomBytes(4).toString("hex")}.tmp`);
  await writeFile(tmpPath, json, "utf-8");
  await rename(tmpPath, outputPath);

  return envelope;
}
