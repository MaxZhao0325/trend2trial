import { XMLParser } from "fast-xml-parser";
import type { TrendItem } from "../../models/trend-item.js";

const ARXIV_RSS_URL = "http://export.arxiv.org/rss/cs.AI";

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

function toTrendItem(item: RssItem): TrendItem | null {
  const title = item.title ? stripHtml(item.title) : "";
  const url = item.link ?? "";
  if (!title || !url) return null;

  const summary = item.description ? stripHtml(item.description).slice(0, 300) : "";
  const publishedAt = item["dc:date"] ?? new Date().toISOString();

  return {
    title,
    url,
    source: "arxiv-rss",
    tags: ["ai", "paper"],
    score: 0,
    publishedAt,
    summary,
    trialRecipeSuggestion: `Reproduce key finding from "${title.slice(0, 60)}".`,
  };
}

export function parseRssFeed(xml: string): TrendItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: false,
  });
  const parsed = parser.parse(xml) as RssFeed;
  const items = extractItems(parsed);
  return items.map(toTrendItem).filter((item): item is TrendItem => item !== null);
}

export async function fetchRss(url: string = ARXIV_RSS_URL): Promise<TrendItem[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
  }
  const xml = await response.text();
  return parseRssFeed(xml);
}
