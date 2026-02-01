import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fetchTrends, renderTrendCardMarkdown } from "trend2trial-core";

const ROOT = new URL("..", import.meta.url).pathname;
const DATA_DIR = join(ROOT, "data");
const CARDS_DIR = join(ROOT, "docs", "cards");

async function main() {
  console.log("Fetching trends...");
  const trends = await fetchTrends();
  console.log(`Fetched ${trends.length} trend items.`);

  mkdirSync(DATA_DIR, { recursive: true });
  const jsonPath = join(DATA_DIR, "trends.json");
  writeFileSync(jsonPath, JSON.stringify(trends, null, 2) + "\n");
  console.log(`Wrote ${jsonPath}`);

  mkdirSync(CARDS_DIR, { recursive: true });
  for (const item of trends) {
    const slug = item.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80);
    const md = renderTrendCardMarkdown(item);
    const cardPath = join(CARDS_DIR, `${slug}.md`);
    writeFileSync(cardPath, md);
  }
  console.log(`Wrote ${trends.length} markdown cards to ${CARDS_DIR}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
