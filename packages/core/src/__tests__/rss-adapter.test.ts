import { describe, it, expect } from "vitest";
import { parseRssFeed } from "../pipeline/adapters/rss.js";

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns="http://purl.org/rss/1.0/">
  <channel>
    <title>cs.AI updates on arXiv.org</title>
    <link>http://arxiv.org</link>
  </channel>
  <item rdf:about="http://arxiv.org/abs/2401.00001">
    <title>Efficient LLM Serving with Speculative Decoding</title>
    <link>http://arxiv.org/abs/2401.00001</link>
    <description>We propose a method for efficient LLM serving using speculative decoding techniques.</description>
    <dc:date>2025-01-15T00:00:00Z</dc:date>
  </item>
  <item rdf:about="http://arxiv.org/abs/2401.00002">
    <title>RAG Pipeline Optimization for Enterprise Search</title>
    <link>http://arxiv.org/abs/2401.00002</link>
    <description>This paper presents optimizations for retrieval-augmented generation pipelines.</description>
    <dc:date>2025-01-14T00:00:00Z</dc:date>
  </item>
</rdf:RDF>`;

const SAMPLE_RSS_STANDARD = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Test Article</title>
      <link>https://example.com/article</link>
      <description>A test article description.</description>
    </item>
  </channel>
</rss>`;

describe("parseRssFeed", () => {
  it("parses RDF-style RSS (arXiv format)", () => {
    const items = parseRssFeed(SAMPLE_RSS);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Efficient LLM Serving with Speculative Decoding");
    expect(items[0].url).toBe("http://arxiv.org/abs/2401.00001");
    expect(items[0].source).toBe("arxiv-rss");
    expect(items[0].summary).toContain("speculative decoding");
    expect(items[0].publishedAt).toBe("2025-01-15T00:00:00Z");
  });

  it("parses standard RSS 2.0 format", () => {
    const items = parseRssFeed(SAMPLE_RSS_STANDARD);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Test Article");
    expect(items[0].url).toBe("https://example.com/article");
  });

  it("returns empty array for feed with no items", () => {
    const xml = `<?xml version="1.0"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"></rdf:RDF>`;
    const items = parseRssFeed(xml);
    expect(items).toEqual([]);
  });

  it("strips HTML tags from title and description", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>&lt;b&gt;Bold Title&lt;/b&gt;</title>
      <link>https://example.com</link>
      <description>&lt;p&gt;Some &lt;em&gt;formatted&lt;/em&gt; text&lt;/p&gt;</description>
    </item>
  </channel>
</rss>`;
    const items = parseRssFeed(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Bold Title");
    expect(items[0].summary).toBe("Some formatted text");
  });

  it("skips items without title or link", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <description>No title or link</description>
    </item>
    <item>
      <title>Has Title</title>
      <link>https://example.com</link>
    </item>
  </channel>
</rss>`;
    const items = parseRssFeed(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Has Title");
  });

  it("sets default tags and source", () => {
    const items = parseRssFeed(SAMPLE_RSS);
    for (const item of items) {
      expect(item.source).toBe("arxiv-rss");
      expect(item.tags).toContain("ai");
      expect(item.tags).toContain("paper");
    }
  });
});
