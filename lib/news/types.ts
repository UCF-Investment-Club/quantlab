export type NewsArticleInput = {
  provider: string;
  providerArticleId: string;
  title: string;
  summary: string | null;
  url: string;
  sourceName: string | null;
  publishedAt: string;
  language: string;
  tickers: string[];
};

export type NewsSentimentLabel = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export type NewsSentiment = {
  label: NewsSentimentLabel;
  score: number;
  modelName: string;
  modelVersion: string;
};
