import { NewsFeed } from "@/components/news/news-feed";
import { getSessionUser } from "@/lib/auth/session";

export default async function DashboardNewsPage() {
  const sessionUser = await getSessionUser();
  const canRunIngestion = sessionUser?.role === "ADMIN";

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 text-[var(--ql-text)]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ql-gold)]">
          News and Macro
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--ql-text)]">
          News Feed
        </h1>
        <p className="mt-3 text-sm text-[var(--ql-text-muted)]">
          Filter ticker-correlated articles by sentiment, text search, and date
          range.
        </p>
      </header>

      <NewsFeed canRunIngestion={canRunIngestion} />
    </main>
  );
}
