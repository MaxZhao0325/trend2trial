import type { TrendCard } from "../models/trend-card.js";

export function renderCardToMarkdown(card: TrendCard): string {
  const lines: string[] = [
    `# ${card.title}`,
    "",
    `> **Category:** ${card.category} | **Relevance:** ${card.relevanceScore}/100 | **Date:** ${card.date}`,
    "",
    card.summary,
    "",
    "## Sources",
    "",
    ...card.sources.map((s) => `- [${s.title}](${s.url}) _(${s.type})_`),
    "",
    `**Tags:** ${card.tags.join(", ")}`,
    "",
  ];
  return lines.join("\n");
}

export function renderCardsToList(cards: TrendCard[]): string {
  if (cards.length === 0) return "No trends found.\n";

  const lines: string[] = ["# Trend Radar", ""];
  for (const card of cards) {
    lines.push(
      `- **[${card.relevanceScore}]** ${card.title} _(${card.category})_ — ${card.summary.slice(0, 80)}…`,
    );
  }
  lines.push("");
  return lines.join("\n");
}
