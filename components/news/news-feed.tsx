"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  id: string;
  title: string;
  summary: string | null;
  sourceName: string | null;
  publishedAt: string;
  url: string;
  tickers: string[];
  sentiment: { label: string; score: number } | null;
};

type NewsResponse = {
  data: NewsItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type IngestResult = {
  runId: string;
  fetchedCount: number;
  insertedCount: number;
  status: "SUCCESS" | "FAILED";
  errorSummary: string | null;
};

type IngestResponse = {
  data: IngestResult | null;
  error?: { message?: string };
};

interface NewsFeedProps {
  canRunIngestion?: boolean;
}

export function NewsFeed({ canRunIngestion = false }: NewsFeedProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [query, setQuery] = useState("");
  const [tickers, setTickers] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  async function fetchFreshness() {
    const response = await fetch("/api/v1/news?page=1&pageSize=1", {
      cache: "no-store",
    });
    if (!response.ok) {
      return;
    }
    const payload = (await response
      .json()
      .catch(() => null)) as NewsResponse | null;
    if (payload?.data?.[0]?.publishedAt) {
      setLastUpdated(payload.data[0].publishedAt);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (query.trim()) {
        params.set("q", query.trim());
      }
      if (tickers.trim()) {
        params.set("tickers", tickers.trim());
      }
      if (sentiment) {
        params.set("sentiment", sentiment);
      }
      if (fromDate) {
        params.set("from", fromDate);
      }
      if (toDate) {
        params.set("to", toDate);
      }

      const response = await fetch(`/api/v1/news?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | NewsResponse
        | { error?: { message?: string } }
        | null;

      if (!response.ok || !payload || !("data" in payload)) {
        setError(
          (payload as { error?: { message?: string } } | null)?.error
            ?.message ?? "Unable to load news",
        );
        return;
      }

      setItems(payload.data ?? []);
      setTotal(payload.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunIngestion() {
    setIngestLoading(true);
    setIngestStatus(null);
    setError(null);

    try {
      const response = await fetch("/api/v1/internal/news/ingest", {
        method: "POST",
        cache: "no-store",
      });

      const payload = (await response
        .json()
        .catch(() => null)) as IngestResponse | null;

      if (!response.ok || !payload?.data) {
        setError(payload?.error?.message ?? "Unable to run ingestion");
        return;
      }

      const result = payload.data;
      if (result.status === "SUCCESS") {
        setIngestStatus(
          `✓ Ingested ${result.insertedCount} articles (${result.fetchedCount} fetched)`,
        );
      } else {
        setIngestStatus(
          `✗ Ingestion failed: ${result.errorSummary ?? "Unknown error"}`,
        );
      }

      // Refresh feed and freshness
      await load();
      await fetchFreshness();
    } finally {
      setIngestLoading(false);
    }
  }

  function applyFilters() {
    if (page !== 1) {
      setPage(1);
      return;
    }

    void load();
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    void fetchFreshness();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="mt-8 space-y-4">
      <div className="ql-panel rounded-xl p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
        {canRunIngestion && (
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRunIngestion()}
              disabled={ingestLoading}
              className="ql-btn-primary rounded-lg px-3 py-2 text-sm disabled:opacity-60"
            >
              {ingestLoading ? "Running Ingestion..." : "Run Ingestion"}
            </button>
            {ingestStatus && (
              <span
                className={`text-xs font-medium ${
                  ingestStatus.startsWith("✓")
                    ? "text-[var(--ql-success)]"
                    : "text-[var(--ql-danger)]"
                }`}
              >
                {ingestStatus}
              </span>
            )}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search headlines"
            className="ql-input rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={tickers}
            onChange={(event) => setTickers(event.target.value)}
            placeholder="Tickers (AAPL,MSFT)"
            className="ql-input rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={sentiment}
            onChange={(event) => setSentiment(event.target.value)}
            className="ql-select rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All sentiment</option>
            <option value="POSITIVE">Positive</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="NEGATIVE">Negative</option>
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="ql-input rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="ql-input rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={applyFilters}
            disabled={loading}
            className="ql-btn-primary rounded-lg px-3 py-2 text-sm disabled:opacity-60"
          >
            Apply Filters
          </button>
        </div>

        <p className="mt-3 text-xs text-[var(--ql-text-subtle)]">
          Latest article timestamp:{" "}
          {lastUpdated ? new Date(lastUpdated).toLocaleString() : "-"}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-[var(--ql-danger)]">{error}</p>
      ) : null}
      {loading ? (
        <p className="text-sm text-[var(--ql-text-muted)]">Loading news...</p>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="ql-panel rounded-xl p-6 text-sm text-[var(--ql-text-muted)] shadow-[0_10px_24px_rgba(0,0,0,0.32)]">
          No articles match your current filters.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="ql-panel rounded-xl p-5 shadow-[0_14px_32px_rgba(0,0,0,0.34)]"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ql-text-subtle)]">
              <span>{item.sourceName ?? "Unknown Source"}</span>
              <span>•</span>
              <span>{new Date(item.publishedAt).toLocaleString()}</span>
              {item.sentiment ? (
                <>
                  <span>•</span>
                  <span className="rounded-full border border-[var(--ql-border)] bg-[rgba(212,175,55,0.14)] px-2 py-0.5 text-[var(--ql-gold)]">
                    {item.sentiment.label} ({item.sentiment.score})
                  </span>
                </>
              ) : null}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-[var(--ql-text)]">
              {item.title}
            </h3>
            {item.summary ? (
              <p className="mt-2 text-sm text-[var(--ql-text-muted)]">
                {item.summary}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {item.tickers.map((ticker) => (
                  <span
                    key={`${item.id}-${ticker}`}
                    className="rounded-md border border-[var(--ql-border)] bg-[var(--ql-surface-soft)] px-2 py-0.5 text-xs text-[var(--ql-text-muted)]"
                  >
                    {ticker}
                  </span>
                ))}
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="ql-link text-sm font-medium underline"
              >
                Read source
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--ql-text-subtle)]">
          {total} article(s)
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((previous) => Math.max(1, previous - 1))}
            className="ql-btn-secondary rounded-md px-2.5 py-1 text-xs disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-[var(--ql-text-muted)]">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((previous) => Math.min(totalPages, previous + 1))
            }
            className="ql-btn-secondary rounded-md px-2.5 py-1 text-xs disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
