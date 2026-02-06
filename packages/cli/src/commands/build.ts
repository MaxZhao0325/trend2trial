import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadTrendsFromFile, renderCardToMarkdown, renderCardsToList } from "trend2trial-core";
import { pathStr, success, header, dim, createSpinner } from "../ui.js";

export async function buildCards(inputPath: string, outputDir: string): Promise<void> {
  const absInput = resolve(inputPath);
  const absOutput = resolve(outputDir);

  const spinner = createSpinner(`Reading trends from ${pathStr(absInput)}`);
  const cards = await loadTrendsFromFile(absInput);
  spinner.stop(`Found ${header(String(cards.length))} valid trend cards`);

  await mkdir(absOutput, { recursive: true });

  for (const card of cards) {
    const filePath = join(absOutput, `${card.id}.md`);
    await writeFile(filePath, renderCardToMarkdown(card), "utf-8");
    console.log(`  ${dim("→")} ${pathStr(filePath)}`);
  }

  const indexPath = join(absOutput, "INDEX.md");
  await writeFile(indexPath, renderCardsToList(cards), "utf-8");
  console.log(`  ${dim("→")} ${pathStr(indexPath)}`);

  console.log(
    `\n${success("Done!")} Generated ${header(String(cards.length))} cards + INDEX.md in ${pathStr(absOutput)}`,
  );
}
