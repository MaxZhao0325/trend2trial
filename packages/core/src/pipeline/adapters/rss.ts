import { XMLParser } from "fast-xml-parser";
import type { TrendItem } from "../../models/trend-item.js";
import type { TrendAdapter, AdapterOptions } from "./types.js";
import { fetchWithRetry } from "../fetch-utils.js";

const DEFAULT_FEED_URLS = [
  "https://export.arxiv.org/rss/cs.AI",
  "https://export.arxiv.org/rss/cs.LG",
  "https://export.arxiv.org/rss/cs.DC",
];

interface RssItem {
  title?: string;
  link?: string;
  description?: string;
  "dc:date"?: string;
}

interface RssFeed {
  "rdf:RDF"?: {
    item?: RssItem | RssItem[];
  };
  rss?: {
    channel?: {
      item?: RssItem | RssItem[];
    };
  };
}

function extractItems(parsed: RssFeed): RssItem[] {
  const rdfItems = parsed["rdf:RDF"]?.item;
  const rssItems = parsed.rss?.channel?.item;
  const raw = rdfItems ?? rssItems;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function feedSourceName(url: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const feedId = pathParts[pathParts.length - 1] ?? "unknown";
    return `arxiv-${feedId}`;
  } catch {
    return "arxiv-rss";
  }
}

function toTrendItem(item: RssItem, source: string): TrendItem | null {
  const title = item.title ? stripHtml(item.title) : "";
  const url = item.link ?? "";
  if (!title || !url) return null;

  const summary = item.description ? stripHtml(item.description).slice(0, 300) : "";
  const publishedAt = item["dc:date"] ?? new Date().toISOString();

  return {
    title,
    url,
    source,
    tags: ["ai", "paper"],
    score: 0,
    publishedAt,
    summary,
    trialRecipeSuggestion: `Reproduce key finding from "${title.slice(0, 60)}".`,
  };
}

export function parseRssFeed(xml: string, source: string = "arxiv-rss"): TrendItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: false,
  });
  const parsed = parser.parse(xml) as RssFeed;
  const items = extractItems(parsed);
  return items.map((item) => toTrendItem(item, source)).filter((item): item is TrendItem => item !== null);
}

export async function fetchRss(url: string = DEFAULT_FEED_URLS[0]): Promise<TrendItem[]> {
  const source = feedSourceName(url);
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
  }
  const xml = await response.text();
  return parseRssFeed(xml, source);
}

async function fetchSingleFeed(
  url: string,
  options?: AdapterOptions,
): Promise<TrendItem[]> {
  const source = feedSourceName(url);
  const response = await fetchWithRetry(url, {
    timeout: options?.timeout,
    signal: options?.signal,
  });
  if (!response.ok) {
    throw new Error(`RSS fetch failed for ${url}: ${response.status} ${response.statusText}`);
  }
  const xml = await response.text();
  let items = parseRssFeed(xml, source);
  if (options?.maxItems) {
    items = items.slice(0, options.maxItems);
  }
  return items;
}

export const rssAdapter: TrendAdapter = {
  name: "arxiv-rss",
  enabled: true,
  async fetch(options?: AdapterOptions): Promise<TrendItem[]> {
    const results = await Promise.all(
      DEFAULT_FEED_URLS.map((url) =>
        fetchSingleFeed(url, options).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`RSS feed ${url} failed, skipping: ${message}`);
          return [] as TrendItem[];
        }),
      ),
    );
    return results.flat();
  },
};
