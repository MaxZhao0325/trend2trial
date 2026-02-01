import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { type TrendCard, validateTrendCard } from "../models/trend-card.js";

export interface LoadTrendsOptions {
  category?: string;
}

export async function loadTrendsFromDir(
  dir: string,
  options?: LoadTrendsOptions,
): Promise<TrendCard[]> {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const jsonFiles = files.filter((f) => f.endsWith(".json"));
  const cards: TrendCard[] = [];

  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(dir, file), "utf-8");
      const data: unknown = JSON.parse(raw);
      const errors = validateTrendCard(data);
      if (errors.length > 0) {
        console.warn(`Skipping ${file}: ${errors.map((e) => `${e.field} — ${e.message}`).join("; ")}`);
        continue;
      }
      cards.push(data as TrendCard);
    } catch {
      console.warn(`Skipping ${file}: failed to parse JSON`);
    }
  }

  let result = cards.sort((a, b) => b.relevanceScore - a.relevanceScore);

  if (options?.category) {
    result = result.filter((c) => c.category === options.category);
  }

  return result;
}

export async function loadTrendsFromFile(filePath: string): Promise<TrendCard[]> {
  const raw = await readFile(filePath, "utf-8");
  const data: unknown = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error(`Expected array in ${filePath}`);
  }

  const cards: TrendCard[] = [];
  for (const item of data) {
    const errors = validateTrendCard(item);
    if (errors.length > 0) {
      console.warn(`Skipping invalid card: ${errors[0].field} — ${errors[0].message}`);
      continue;
    }
    cards.push(item as TrendCard);
  }

  return cards.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
