import type { TrendItem } from "../models/trend-item.js";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const pathname = parsed.pathname.endsWith("/") ? parsed.pathname.slice(0, -1) : parsed.pathname;
    return `${host}${pathname}`.toLowerCase();
  } catch {
    let s = url.toLowerCase();
    if (s.startsWith("https://")) s = s.slice(8);
    else if (s.startsWith("http://")) s = s.slice(7);
    if (s.startsWith("www.")) s = s.slice(4);
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function bigrams(text: string): Set<string> {
  const result = new Set<string>();
  const n = normalize(text);
  for (let i = 0; i < n.length - 1; i++) {
    result.add(n.slice(i, i + 2));
  }
  return result;
}

function diceCoefficient(a: string, b: string): number {
  const ba = bigrams(a);
  const bb = bigrams(b);
  if (ba.size === 0 && bb.size === 0) return 1;
  if (ba.size === 0 || bb.size === 0) return 0;
  let intersection = 0;
  for (const bg of ba) {
    if (bb.has(bg)) intersection++;
  }
  return (2 * intersection) / (ba.size + bb.size);
}

const FUZZY_THRESHOLD = 0.85;

function dedupKey(item: TrendItem): string {
  return `${normalize(item.title)}|${normalizeUrl(item.url)}`;
}

export function dedup(items: TrendItem[]): TrendItem[] {
  const seen = new Set<string>();
  const result: TrendItem[] = [];

  // Pass 1: exact dedup (normalized title + normalized URL)
  const afterExact: TrendItem[] = [];
  for (const item of items) {
    const key = dedupKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      afterExact.push(item);
    }
  }

  // Pass 2: cross-source dedup via normalized URL
  // Only merge when items come from DIFFERENT sources and share the same URL
  const seenByNormalizedUrl = new Map<string, TrendItem>();
  for (const item of afterExact) {
    const normUrl = normalizeUrl(item.url);
    const existing = seenByNormalizedUrl.get(normUrl);
    if (existing && existing.source !== item.source) {
      // Cross-source duplicate: keep the higher-scored one
      if (item.score > existing.score) {
        const idx = result.indexOf(existing);
        if (idx !== -1) result[idx] = item;
        seenByNormalizedUrl.set(normUrl, item);
      }
    } else if (!existing) {
      seenByNormalizedUrl.set(normUrl, item);
      result.push(item);
    } else {
      // Same source, different title, same URL: keep both
      result.push(item);
    }
  }

  // Pass 3: fuzzy title matching within same domain
  const toRemove = new Set<number>();
  for (let i = 0; i < result.length; i++) {
    if (toRemove.has(i)) continue;
    for (let j = i + 1; j < result.length; j++) {
      if (toRemove.has(j)) continue;
      const domainA = getDomain(result[i].url);
      const domainB = getDomain(result[j].url);
      if (domainA && domainB && domainA === domainB) {
        const similarity = diceCoefficient(result[i].title, result[j].title);
        if (similarity >= FUZZY_THRESHOLD) {
          if (result[j].score > result[i].score) {
            toRemove.add(i);
          } else {
            toRemove.add(j);
          }
        }
      }
    }
  }

  return result.filter((_, idx) => !toRemove.has(idx));
}
