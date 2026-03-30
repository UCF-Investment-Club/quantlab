import type { NewsArticleInput, NewsSentiment } from "@/lib/news/types";

const POSITIVE_WORDS = [
  "beat",
  "growth",
  "surge",
  "upgrade",
  "strong",
  "record",
];
const NEGATIVE_WORDS = [
  "miss",
  "downgrade",
  "drop",
  "lawsuit",
  "weak",
  "decline",
];

export function tagArticleSentiment(article: NewsArticleInput): NewsSentiment {
  const haystack = `${article.title} ${article.summary ?? ""}`.toLowerCase();

  const positive = POSITIVE_WORDS.reduce(
    (count, word) => (haystack.includes(word) ? count + 1 : count),
    0,
  );
  const negative = NEGATIVE_WORDS.reduce(
    (count, word) => (haystack.includes(word) ? count + 1 : count),
    0,
  );

  const rawScore = positive - negative;
  const clamped = Math.max(-1, Math.min(1, rawScore / 3));

  if (clamped > 0.2) {
    return {
      label: "POSITIVE",
      score: Number(clamped.toFixed(4)),
      modelName: "keyword-baseline",
      modelVersion: "1.0.0",
    };
  }

  if (clamped < -0.2) {
    return {
      label: "NEGATIVE",
      score: Number(clamped.toFixed(4)),
      modelName: "keyword-baseline",
      modelVersion: "1.0.0",
    };
  }

  return {
    label: "NEUTRAL",
    score: Number(clamped.toFixed(4)),
    modelName: "keyword-baseline",
    modelVersion: "1.0.0",
  };
}
