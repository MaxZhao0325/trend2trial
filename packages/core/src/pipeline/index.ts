import type { TrendItem } from "../models/trend-item.js";
import type { TrendCard } from "../models/trend-card.js";
import type { TrendAdapter, AdapterOptions } from "./adapters/types.js";
import { rssAdapter } from "./adapters/rss.js";
import { hackernewsAdapter } from "./adapters/hackernews.js";
import { dedup } from "./dedup.js";
import { rank } from "./ranker.js";
import { convertToTrendCards } from "./card-converter.js";
import { writeTrends } from "./writer.js";
import type { RankConfig } from "./ranker.js";

export { parseRssFeed, fetchRss, rssAdapter } from "./adapters/rss.js";
export { fetchHackerNews, hackernewsAdapter } from "./adapters/hackernews.js";
export type { TrendAdapter, AdapterOptions } from "./adapters/types.js";
export { dedup } from "./dedup.js";
export { rank } from "./ranker.js";
export type { RankConfig } from "./ranker.js";
export { renderTrendCardMarkdown, renderAllCards } from "./card-renderer.js";
export { convertToTrendCard, convertToTrendCards } from "./card-converter.js";
export { writeTrends, CURRENT_SCHEMA_VERSION } from "./writer.js";
export type { TrendsEnvelope } from "./writer.js";
export { fetchWithRetry, runWithConcurrency } from "./fetch-utils.js";
export type { RetryOptions } from "./fetch-utils.js";

const defaultAdapters: TrendAdapter[] = [rssAdapter, hackernewsAdapter];

export async function fetchTrends(options?: AdapterOptions): Promise<TrendItem[]> {
  const adapterResults = await Promise.all(
    defaultAdapters
      .filter((adapter) => adapter.enabled)
      .map((adapter) =>
        adapter.fetch(options).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`${adapter.name} fetch failed, skipping: ${message}`);
          return [] as TrendItem[];
        }),
      ),
  );
  const all = adapterResults.flat();
  const unique = dedup(all);
  const ranked = rank(unique);
  return ranked;
}

export async function fetchTrendCards(options?: AdapterOptions): Promise<TrendCard[]> {
  const items = await fetchTrends(options);
  return convertToTrendCards(items);
}

export interface PipelineOptions {
  adapters?: TrendAdapter[];
  adapterOptions?: AdapterOptions;
  rankConfig?: Partial<RankConfig>;
  outputPath?: string;
}

export async function runPipeline(options?: PipelineOptions): Promise<TrendCard[]> {
  const adapters = options?.adapters ?? defaultAdapters;

  const adapterResults = await Promise.all(
    adapters
      .filter((adapter) => adapter.enabled)
      .map((adapter) =>
        adapter.fetch(options?.adapterOptions).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`${adapter.name} fetch failed, skipping: ${message}`);
          return [] as TrendItem[];
        }),
      ),
  );

  const all = adapterResults.flat();
  const unique = dedup(all);
  const ranked = rank(unique, options?.rankConfig);
  const cards = convertToTrendCards(ranked);

  if (options?.outputPath) {
    await writeTrends(cards, options.outputPath);
  }

  return cards;
}
