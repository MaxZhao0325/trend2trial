import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadTrendsFromFile, renderCardToMarkdown, renderCardsToList } from "trend2trial-core";

export async function buildCards(inputPath: string, outputDir: string): Promise<void> {
  const absInput = resolve(inputPath);
  const absOutput = resolve(outputDir);

  console.log(`Reading trends from ${absInput}`);
  const cards = await loadTrendsFromFile(absInput);
  console.log(`Found ${cards.length} valid trend cards`);

  await mkdir(absOutput, { recursive: true });

  for (const card of cards) {
    const filePath = join(absOutput, `${card.id}.md`);
    await writeFile(filePath, renderCardToMarkdown(card), "utf-8");
    console.log(`  → ${filePath}`);
  }

  const indexPath = join(absOutput, "INDEX.md");
  await writeFile(indexPath, renderCardsToList(cards), "utf-8");
  console.log(`  → ${indexPath}`);

  console.log(`\nDone! Generated ${cards.length} cards + INDEX.md in ${absOutput}`);
}
