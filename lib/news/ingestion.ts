import { hashToken } from "@/lib/security/token";
import { tagArticleSentiment } from "@/lib/sentiment/tagger";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { fetchYahooNews } from "@/lib/providers/yahoo-news";
import type { NewsArticleInput } from "@/lib/news/types";

type IngestionResult = {
  runId: string;
  fetchedCount: number;
  insertedCount: number;
  status: "SUCCESS" | "FAILED";
  errorSummary: string | null;
};

const MAX_FETCH_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getIngestionTickers(): string[] {
  return [
    "AAPL",
    "MSFT",
    "NVDA",
    "AMZN",
    "GOOGL",
    "META",
    "TSLA",
    "SPY",
    "QQQ",
    "IWM",
    "XLF",
    "XLK",
    "JPM",
    "BAC",
    "WFC",
    "GS",
    "MS",
    "BRK-B",
    "V",
    "MA",
    "AMD",
    "INTC",
    "AVGO",
    "NFLX",
    "CRM",
  ];
}

function mergeArticlesByUrl(articles: NewsArticleInput[]): NewsArticleInput[] {
  const byUrl = new Map<string, NewsArticleInput>();

  for (const article of articles) {
    const key = article.url.toLowerCase();
    const existing = byUrl.get(key);

    if (!existing) {
      byUrl.set(key, article);
      continue;
    }

    byUrl.set(key, {
      ...existing,
      tickers: [...new Set([...existing.tickers, ...article.tickers])],
    });
  }

  return [...byUrl.values()];
}

export async function runNewsIngestion(): Promise<IngestionResult> {
  const supabase = createSupabaseAdminClient();

  const { data: run, error: runError } = await supabase
    .from("news_ingestion_runs")
    .insert({
      provider: "yahoo-finance2",
      status: "RUNNING",
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(runError?.message ?? "Unable to create ingestion run");
  }

  let fetchedCount = 0;
  let insertedCount = 0;
  let status: IngestionResult["status"] = "SUCCESS";
  let errorSummary: string | null = null;
  const persistenceErrors: string[] = [];
  let retryCount = 0;

  try {
    const tickers = getIngestionTickers();
    let articles: NewsArticleInput[] = [];
    let lastFetchError: string | null = null;

    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
      try {
        articles = await fetchYahooNews(tickers);
        retryCount = attempt - 1;
        lastFetchError = null;
        break;
      } catch (error) {
        retryCount = attempt - 1;
        lastFetchError =
          error instanceof Error ? error.message : "Unknown provider error";

        if (attempt === MAX_FETCH_ATTEMPTS) {
          throw new Error(
            `Yahoo fetch failed after ${MAX_FETCH_ATTEMPTS} attempts: ${lastFetchError}`,
          );
        }

        // Exponential backoff (500ms, 1s) for transient provider errors.
        await sleep(500 * 2 ** (attempt - 1));
      }
    }

    if (articles.length === 0 && lastFetchError) {
      throw new Error(lastFetchError);
    }

    fetchedCount = articles.length;
    const mergedArticles = mergeArticlesByUrl(articles);

    for (const article of mergedArticles) {
      const urlHash = hashToken(article.url.toLowerCase());

      const { data: persisted, error: persistError } = await supabase
        .from("news_articles")
        .upsert(
          {
            provider: article.provider,
            provider_article_id: article.providerArticleId,
            title: article.title,
            summary: article.summary,
            url: article.url,
            url_hash: urlHash,
            source_name: article.sourceName,
            published_at: article.publishedAt,
            language: article.language,
          },
          {
            // URL is the canonical unique identity in our schema.
            onConflict: "url_hash",
          },
        )
        .select("id")
        .single();

      if (persistError || !persisted) {
        const message = persistError?.message ?? "Unknown persistence failure";
        console.error(
          `[news-ingestion] Failed to persist article ${article.providerArticleId}: ${message}`,
        );
        persistenceErrors.push(`${article.providerArticleId}: ${message}`);

        try {
          await supabase.from("news_ingestion_dead_letters").insert({
            run_id: run.id,
            provider: article.provider,
            article_external_id: article.providerArticleId,
            payload_json: {
              title: article.title,
              url: article.url,
              sourceName: article.sourceName,
              publishedAt: article.publishedAt,
              tickers: article.tickers,
            },
            error_message: message,
          });
        } catch (deadLetterError) {
          const deadLetterMessage =
            deadLetterError instanceof Error
              ? deadLetterError.message
              : "Unknown dead-letter persistence failure";
          console.error(
            `[news-ingestion] Failed to write dead-letter for article ${article.providerArticleId}: ${deadLetterMessage}`,
          );
        }

        continue;
      }

      insertedCount += 1;

      const uniqueTickers = [
        ...new Set(article.tickers.map((ticker) => ticker.toUpperCase())),
      ];
      if (uniqueTickers.length > 0) {
        await supabase.from("news_article_tickers").upsert(
          uniqueTickers.map((ticker) => ({
            article_id: persisted.id,
            ticker,
          })),
          { onConflict: "article_id,ticker" },
        );
      }

      const sentiment = tagArticleSentiment(article);
      await supabase.from("news_article_sentiment").upsert(
        {
          article_id: persisted.id,
          label: sentiment.label,
          score: sentiment.score,
          model_name: sentiment.modelName,
          model_version: sentiment.modelVersion,
        },
        { onConflict: "article_id" },
      );
    }

    if (
      fetchedCount > 0 &&
      insertedCount === 0 &&
      persistenceErrors.length > 0
    ) {
      status = "FAILED";
      errorSummary = `Fetched ${fetchedCount} article(s) but persisted 0. Sample persistence errors: ${persistenceErrors
        .slice(0, 3)
        .join(" | ")}`;
    }
  } catch (error) {
    status = "FAILED";
    errorSummary =
      error instanceof Error ? error.message : "Unknown ingestion error";
  }

  await supabase
    .from("news_ingestion_runs")
    .update({
      status,
      fetched_count: fetchedCount,
      inserted_count: insertedCount,
      retry_count: retryCount,
      error_summary: errorSummary,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id);

  return {
    runId: run.id,
    fetchedCount,
    insertedCount,
    status,
    errorSummary,
  };
}
