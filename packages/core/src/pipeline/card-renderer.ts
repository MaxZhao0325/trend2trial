import type { TrendItem } from "../models/trend-item.js";

function inferInfraAngle(item: TrendItem): string {
  const text = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
  const angles: string[] = [];

  if (text.includes("serving") || text.includes("inference") || text.includes("latency")) {
    angles.push("Model serving and inference optimization");
  }
  if (text.includes("rag") || text.includes("vector") || text.includes("embedding")) {
    angles.push("RAG pipeline and vector search");
  }
  if (text.includes("deploy") || text.includes("kubernetes") || text.includes("docker")) {
    angles.push("Deployment and orchestration");
  }
  if (text.includes("quantiz") || text.includes("ggml") || text.includes("gguf")) {
    angles.push("Model compression and quantization");
  }
  if (text.includes("fine-tun") || text.includes("lora") || text.includes("training")) {
    angles.push("Fine-tuning and training efficiency");
  }

  if (angles.length === 0) {
    angles.push("General AI infrastructure relevance");
  }

  return angles.join(". ") + ".";
}

export function renderTrendCardMarkdown(item: TrendItem): string {
  const lines: string[] = [
    `# ${item.title}`,
    "",
    `> Score: ${item.score}/100 | Source: ${item.source} | Published: ${item.publishedAt}`,
    "",
    "## Why It Matters",
    "",
    item.summary,
    "",
    "## Infra Angle",
    "",
    inferInfraAngle(item),
    "",
    "## Quick Trial",
    "",
    item.trialRecipeSuggestion,
    "",
    "## Links",
    "",
    `- [Original](${item.url})`,
    "",
  ];
  return lines.join("\n");
}

export function renderAllCards(items: TrendItem[]): string {
  return items.map(renderTrendCardMarkdown).join("\n---\n\n");
}
