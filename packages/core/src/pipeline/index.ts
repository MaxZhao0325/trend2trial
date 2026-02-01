import { fetchRss } from "./adapters/rss.js";
import { fetchHackerNews } from "./adapters/hackernews.js";
import { dedup } from "./dedup.js";
import { rank } from "./ranker.js";

export { parseRssFeed, fetchRss } from "./adapters/rss.js";
export { fetchHackerNews } from "./adapters/hackernews.js";
export { dedup } from "./dedup.js";
export { rank } from "./ranker.js";
export { renderTrendCardMarkdown, renderAllCards } from "./card-renderer.js";

export async function fetchTrends(): Promise<
  import("../models/trend-item.js").TrendItem[]
> {
  const [rssItems, hnItems] = await Promise.all([
    fetchRss().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`RSS fetch failed, skipping: ${message}`);
      return [];
    }),
    fetchHackerNews().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`HN fetch failed, skipping: ${message}`);
      return [];
    }),
  ]);
  const all = [...rssItems, ...hnItems];
  const unique = dedup(all);
  const ranked = rank(unique);
  return ranked;
}
