import { describe, expect, it } from "vitest";

import { tagArticleSentiment } from "@/lib/sentiment/tagger";

describe("news sentiment tagger", () => {
  it("marks positive article text", () => {
    const result = tagArticleSentiment({
      provider: "test",
      providerArticleId: "1",
      title: "Company reports strong growth and record demand",
      summary: "Analysts upgrade outlook after beat.",
      url: "https://example.com/a",
      sourceName: "Test",
      publishedAt: new Date().toISOString(),
      language: "en",
      tickers: ["AAPL"],
    });

    expect(result.label).toBe("POSITIVE");
    expect(result.score).toBeGreaterThan(0);
  });

  it("marks negative article text", () => {
    const result = tagArticleSentiment({
      provider: "test",
      providerArticleId: "2",
      title: "Stock drops after weak quarter miss",
      summary: "Analysts downgrade shares amid decline.",
      url: "https://example.com/b",
      sourceName: "Test",
      publishedAt: new Date().toISOString(),
      language: "en",
      tickers: ["MSFT"],
    });

    expect(result.label).toBe("NEGATIVE");
    expect(result.score).toBeLessThan(0);
  });
});
