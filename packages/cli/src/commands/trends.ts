import { resolve } from "node:path";
import { fetchTrendCards, writeTrends } from "trend2trial-core";
import type { TrendCard } from "trend2trial-core";
import { pathStr, success, header, dim, categoryBadge, createSpinner } from "../ui.js";

export interface TrendsFetchFlags {
  json?: boolean;
  output?: string;
}

export async function trendsFetch(flags: TrendsFetchFlags = {}): Promise<void> {
  const spinner = createSpinner("Fetching trends from adapters...");
  const cards = await fetchTrendCards();
  spinner.stop(`Fetched ${header(String(cards.length))} trend cards`);

  if (flags.output) {
    const absOutput = resolve(flags.output);
    await writeTrends(cards, absOutput);
    console.log(`${success("Saved")} trends to ${pathStr(absOutput)}`);
    return;
  }

  if (flags.json) {
    console.log(JSON.stringify(cards, null, 2));
    return;
  }

  printTrendsTable(cards);
}

function printTrendsTable(cards: TrendCard[]): void {
  if (cards.length === 0) {
    console.log("No trends found.");
    return;
  }

  console.log("");
  console.log(
    header("Score".padEnd(8)) +
      header("Category".padEnd(12)) +
      header("Date".padEnd(13)) +
      header("Title"),
  );
  console.log(dim("-".repeat(80)));
  for (const c of cards) {
    console.log(
      String(c.relevanceScore).padEnd(8) +
        categoryBadge(c.category).padEnd(
          12 + (categoryBadge(c.category).length - c.category.length),
        ) +
        dim(c.date).padEnd(13 + (dim(c.date).length - c.date.length)) +
        c.title,
    );
  }
  console.log("");
  console.log(dim(`${cards.length} trends total`));
}
