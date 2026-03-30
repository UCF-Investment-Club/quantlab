"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");

  const isConfirmMode = useMemo(
    () => Boolean(accessToken && refreshToken),
    [accessToken, refreshToken],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/auth/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "Unable to request reset.");
        return;
      }

      setMessage("If the account exists, a reset email has been sent.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          accessToken,
          refreshToken,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "Unable to update password.");
        return;
      }

      setMessage("Password updated. You can now sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ql-bg)] px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-[var(--ql-border)] bg-[var(--ql-surface)] p-8 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
        <h1 className="text-2xl font-semibold text-[var(--ql-text)]">
          Reset password
        </h1>

        {isConfirmMode ? (
          <form className="mt-6 space-y-4" onSubmit={confirmReset}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--ql-text-muted)]">
                New password
              </span>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-[var(--ql-border)] bg-[var(--ql-surface-soft)] px-3 py-2 text-sm text-[var(--ql-text)] outline-none placeholder:text-[var(--ql-text-subtle)] focus:border-[var(--ql-gold)] focus:ring-2 focus:ring-[color:var(--ql-gold-glow)]"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--ql-gold)] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[var(--ql-gold-strong)] disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={requestReset}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--ql-text-muted)]">
                Account email
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-[var(--ql-border)] bg-[var(--ql-surface-soft)] px-3 py-2 text-sm text-[var(--ql-text)] outline-none placeholder:text-[var(--ql-text-subtle)] focus:border-[var(--ql-gold)] focus:ring-2 focus:ring-[color:var(--ql-gold-glow)]"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--ql-gold)] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[var(--ql-gold-strong)] disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        {message ? (
          <p className="mt-4 text-sm text-[var(--ql-success)]">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-[var(--ql-danger)]">{error}</p>
        ) : null}
      </section>
    </main>
  );
}
