import { describe, it, expect } from "vitest";
import { renderTrendCardMarkdown, renderAllCards } from "../pipeline/card-renderer.js";
import type { TrendItem } from "../models/trend-item.js";

function makeItem(overrides: Partial<TrendItem> = {}): TrendItem {
  return {
    title: "Test Item",
    url: "https://example.com/test",
    source: "test",
    tags: [],
    score: 75,
    publishedAt: "2025-01-15T00:00:00Z",
    summary: "A test item summary",
    trialRecipeSuggestion: "Try running this experiment",
    ...overrides,
  };
}

describe("renderTrendCardMarkdown", () => {
  it("renders markdown with title, score, source, and published date", () => {
    const md = renderTrendCardMarkdown(makeItem());
    expect(md).toContain("# Test Item");
    expect(md).toContain("Score: 75/100");
    expect(md).toContain("Source: test");
    expect(md).toContain("Published: 2025-01-15T00:00:00Z");
  });

  it("contains Why It Matters section with summary", () => {
    const md = renderTrendCardMarkdown(makeItem({ summary: "Important discovery" }));
    expect(md).toContain("## Why It Matters");
    expect(md).toContain("Important discovery");
  });

  it("contains Quick Trial section with recipe suggestion", () => {
    const md = renderTrendCardMarkdown(makeItem({ trialRecipeSuggestion: "Run the benchmark" }));
    expect(md).toContain("## Quick Trial");
    expect(md).toContain("Run the benchmark");
  });

  it("contains Links section with URL", () => {
    const md = renderTrendCardMarkdown(makeItem({ url: "https://arxiv.org/abs/1234" }));
    expect(md).toContain("## Links");
    expect(md).toContain("[Original](https://arxiv.org/abs/1234)");
  });

  it("infers serving infra angle from keywords", () => {
    const md = renderTrendCardMarkdown(
      makeItem({ title: "GPU serving latency benchmark", summary: "inference optimization" }),
    );
    expect(md).toContain("## Infra Angle");
    expect(md).toContain("Model serving and inference optimization");
  });

  it("infers RAG infra angle from keywords", () => {
    const md = renderTrendCardMarkdown(makeItem({ title: "RAG vector embedding pipeline" }));
    expect(md).toContain("RAG pipeline and vector search");
  });

  it("infers deployment infra angle from keywords", () => {
    const md = renderTrendCardMarkdown(makeItem({ title: "Deploy with kubernetes" }));
    expect(md).toContain("Deployment and orchestration");
  });

  it("infers quantization infra angle from keywords", () => {
    const md = renderTrendCardMarkdown(makeItem({ title: "GGML quantization guide" }));
    expect(md).toContain("Model compression and quantization");
  });

  it("infers fine-tuning infra angle from keywords", () => {
    const md = renderTrendCardMarkdown(makeItem({ title: "LoRA fine-tuning at scale" }));
    expect(md).toContain("Fine-tuning and training efficiency");
  });

  it("shows general relevance when no keywords match", () => {
    const md = renderTrendCardMarkdown(
      makeItem({ title: "Interesting news", summary: "Something happened", tags: [] }),
    );
    expect(md).toContain("General AI infrastructure relevance");
  });

  it("joins multiple angles with period-space separator", () => {
    const md = renderTrendCardMarkdown(
      makeItem({
        title: "Serving with LoRA fine-tuning on rag vector",
        summary: "latency optimization for embedding",
      }),
    );
    // Should match multiple angles
    expect(md).toContain("Model serving and inference optimization");
    expect(md).toContain("RAG pipeline and vector search");
    expect(md).toContain("Fine-tuning and training efficiency");
  });
});

describe("renderAllCards", () => {
  it("joins multiple cards with --- separator", () => {
    const items = [makeItem({ title: "Card One" }), makeItem({ title: "Card Two" })];
    const result = renderAllCards(items);
    expect(result).toContain("# Card One");
    expect(result).toContain("# Card Two");
    expect(result).toContain("---");
  });

  it("returns empty string for empty array", () => {
    expect(renderAllCards([])).toBe("");
  });

  it("renders single card without separator", () => {
    const result = renderAllCards([makeItem({ title: "Solo" })]);
    expect(result).toContain("# Solo");
    expect(result).not.toContain("---");
  });
});
