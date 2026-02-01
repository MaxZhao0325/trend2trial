import type { TrendItem } from "../models/trend-item.js";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupKey(item: TrendItem): string {
  return `${normalize(item.title)}|${item.url}`;
}

export function dedup(items: TrendItem[]): TrendItem[] {
  const seen = new Set<string>();
  const result: TrendItem[] = [];
  for (const item of items) {
    const key = dedupKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}
