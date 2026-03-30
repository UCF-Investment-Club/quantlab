import type { NewsArticleInput } from "@/lib/news/types";

type YahooItem = {
  uuid?: string;
  id?: string;
  title?: string;
  summary?: string;
  link?: string;
  providerPublishTime?: number;
  publisher?: string;
};

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function normalizePublishedAt(providerPublishTime?: number): string {
  if (!Number.isFinite(providerPublishTime)) {
    return new Date().toISOString();
  }

  const raw = providerPublishTime as number;
  // Yahoo payloads can arrive as epoch seconds, milliseconds, microseconds, or nanoseconds.
  let millis: number;
  if (raw >= 100_000_000_000_000_000) {
    // ns -> ms
    millis = Math.trunc(raw / 1_000_000);
  } else if (raw >= 100_000_000_000_000) {
    // us -> ms
    millis = Math.trunc(raw / 1_000);
  } else if (raw >= 100_000_000_000) {
    // ms
    millis = raw;
  } else {
    // s -> ms
    millis = raw * 1000;
  }

  const date = new Date(millis);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  // Guard against provider unit anomalies producing impossible far-future/past dates.
  const year = date.getUTCFullYear();
  if (year < 2000 || year > 2100) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function normalizeArticle(
  item: YahooItem,
  ticker: string,
): NewsArticleInput | null {
  const providerArticleId = item.uuid ?? item.id;
  const url = item.link;
  const title = item.title?.trim();

  if (!providerArticleId || !url || !title) {
    return null;
  }

  const publishedAt = normalizePublishedAt(item.providerPublishTime);

  return {
    provider: "yahoo-finance2",
    providerArticleId,
    title,
    summary: item.summary?.trim() ?? null,
    url,
    sourceName: item.publisher?.trim() ?? "Yahoo Finance",
    publishedAt,
    language: "en",
    tickers: [normalizeTicker(ticker)],
  };
}

export async function fetchYahooNews(
  tickers: string[],
): Promise<NewsArticleInput[]> {
  const moduleRef = await import("yahoo-finance2");
  const YahooFinance = moduleRef.default as unknown as new () => {
    search: (
      query: string,
      options: { newsCount: number; quotesCount: number },
    ) => Promise<{
      news?: YahooItem[];
    }>;
  };
  const yahoo = new YahooFinance();

  const normalized: NewsArticleInput[] = [];
  const failedTickers: string[] = [];
  const failedMessages: string[] = [];

  for (const tickerRaw of tickers) {
    const ticker = normalizeTicker(tickerRaw);

    try {
      const result = await yahoo.search(ticker, {
        newsCount: 12,
        quotesCount: 0,
      });

      for (const item of result.news ?? []) {
        const article = normalizeArticle(item, ticker);
        if (article) {
          normalized.push(article);
        }
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : String(error ?? "Unknown error");
      console.error(`[yahoo-news] Failed to fetch ${ticker}: ${message}`);
      failedTickers.push(ticker);
      failedMessages.push(message);

      // Continue processing other tickers when a provider call fails.
    }
  }

  if (tickers.length > 0 && failedTickers.length === tickers.length) {
    throw new Error(
      `Yahoo news fetch failed for all tickers: ${failedTickers.join(", ")} | messages: ${failedMessages.join(" | ")}`,
    );
  }

  if (normalized.length === 0 && failedTickers.length > 0) {
    console.warn(
      `[yahoo-news] No normalized articles returned. Failed tickers: ${failedTickers.join(", ")}. Sample errors: ${failedMessages.slice(0, 3).join(" | ")}`,
    );
  }

  return normalized;
}
