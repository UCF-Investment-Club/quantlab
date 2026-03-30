import { NextResponse } from "next/server";

import { canRolePerform } from "@/lib/auth/policy";
import { resolveRoleForUser } from "@/lib/auth/role";
import { failure, success } from "@/lib/http/envelope";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

type NewsRow = {
  id: string;
  provider: string;
  provider_article_id: string;
  title: string;
  summary: string | null;
  url: string;
  source_name: string | null;
  published_at: string;
  language: string;
  inserted_at: string;
  news_article_tickers: { ticker: string }[];
  news_article_sentiment: {
    label: string;
    score: number;
    model_name: string | null;
    model_version: string | null;
  }[];
};

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseCsv(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function parseDateStartUtc(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number.parseInt(dateOnlyMatch[1], 10);
    const monthIndex = Number.parseInt(dateOnlyMatch[2], 10) - 1;
    const day = Number.parseInt(dateOnlyMatch[3], 10);
    const parsed = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function parseDateEndExclusiveUtc(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number.parseInt(dateOnlyMatch[1], 10);
    const monthIndex = Number.parseInt(dateOnlyMatch[2], 10) - 1;
    const day = Number.parseInt(dateOnlyMatch[3], 10);
    const parsed = new Date(Date.UTC(year, monthIndex, day + 1, 0, 0, 0, 0));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export async function GET(request: Request) {
  const supabase = await createSupabaseRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      failure("UNAUTHORIZED", "Authentication required"),
      {
        status: 401,
      },
    );
  }

  const role = await resolveRoleForUser(supabase, { id: user.id });
  if (!canRolePerform(role, "READ_NEWS")) {
    return NextResponse.json(failure("FORBIDDEN", "Insufficient permissions"), {
      status: 403,
    });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const tickers = parseCsv(url.searchParams.get("tickers"));
  const sentiment =
    url.searchParams.get("sentiment")?.trim().toUpperCase() ?? "";
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");
  const fromDateIso = parseDateStartUtc(fromDate);
  const toDateExclusiveIso = parseDateEndExclusiveUtc(toDate);

  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const pageSize = Math.min(
    parsePositiveInt(url.searchParams.get("pageSize"), 20),
    100,
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const tickerSelect =
    tickers.length > 0
      ? "news_article_tickers!inner(ticker)"
      : "news_article_tickers(ticker)";
  const sentimentSelect = sentiment
    ? "news_article_sentiment!inner(label,score,model_name,model_version)"
    : "news_article_sentiment(label,score,model_name,model_version)";

  let query = supabase
    .from("news_articles")
    .select(
      `id,provider,provider_article_id,title,summary,url,source_name,published_at,language,inserted_at,${tickerSelect},${sentimentSelect}`,
      { count: "exact" },
    )
    .order("published_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
  }

  if (fromDateIso) {
    query = query.gte("published_at", fromDateIso);
  }

  if (toDateExclusiveIso) {
    query = query.lt("published_at", toDateExclusiveIso);
  }

  if (tickers.length > 0) {
    query = query.in("news_article_tickers.ticker", tickers);
  }

  if (sentiment) {
    query = query.eq("news_article_sentiment.label", sentiment);
  }

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json(failure("NEWS_QUERY_FAILED", error.message), {
      status: 500,
    });
  }

  const articles = ((data ?? []) as NewsRow[]).map((item) => ({
    id: item.id,
    provider: item.provider,
    providerArticleId: item.provider_article_id,
    title: item.title,
    summary: item.summary,
    url: item.url,
    sourceName: item.source_name,
    publishedAt: item.published_at,
    language: item.language,
    insertedAt: item.inserted_at,
    tickers: (item.news_article_tickers ?? []).map((entry) => entry.ticker),
    sentiment: item.news_article_sentiment?.[0]
      ? {
          label: item.news_article_sentiment[0].label,
          score: item.news_article_sentiment[0].score,
          modelName: item.news_article_sentiment[0].model_name,
          modelVersion: item.news_article_sentiment[0].model_version,
        }
      : null,
  }));

  return NextResponse.json(
    success(articles, {
      page,
      pageSize,
      total: count ?? 0,
    }),
  );
}
