import { describe, it, expect } from "vitest";
import { validateTrendCard } from "../models/trend-card.js";
import { renderCardToMarkdown } from "../trends/renderer.js";
import type { TrendCard } from "../models/trend-card.js";

const validCard: TrendCard = {
  id: "test-trend",
  title: "Test Trend",
  summary: "A test trend for unit testing.",
  category: "serving",
  sources: [{ title: "Source", url: "https://example.com", type: "repo" }],
  date: "2025-01-01",
  relevanceScore: 80,
  tags: ["test"],
};

describe("validateTrendCard", () => {
  it("returns no errors for a valid card", () => {
    expect(validateTrendCard(validCard)).toEqual([]);
  });

  it("returns error for null input", () => {
    const errors = validateTrendCard(null);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("root");
  });

  it("returns error for missing required fields", () => {
    const errors = validateTrendCard({ id: "" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.field === "id")).toBe(true);
  });

  it("returns error for invalid category", () => {
    const errors = validateTrendCard({ ...validCard, category: "invalid" });
    expect(errors.some((e) => e.field === "category")).toBe(true);
  });

  it("returns error for invalid source URL", () => {
    const errors = validateTrendCard({
      ...validCard,
      sources: [{ title: "Bad", url: "not-a-url", type: "repo" }],
    });
    expect(errors.some((e) => e.field === "sources[0].url")).toBe(true);
  });

  it("returns error for empty sources array", () => {
    const errors = validateTrendCard({ ...validCard, sources: [] });
    expect(errors.some((e) => e.field === "sources")).toBe(true);
  });

  it("returns error for relevanceScore out of range", () => {
    const errors = validateTrendCard({ ...validCard, relevanceScore: 150 });
    expect(errors.some((e) => e.field === "relevanceScore")).toBe(true);
  });
});

describe("renderCardToMarkdown", () => {
  it("produces valid markdown with title and sources", () => {
    const md = renderCardToMarkdown(validCard);
    expect(md).toContain("# Test Trend");
    expect(md).toContain("**Category:** serving");
    expect(md).toContain("[Source](https://example.com)");
    expect(md).toContain("**Tags:** test");
  });
});
