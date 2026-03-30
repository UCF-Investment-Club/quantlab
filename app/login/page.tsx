"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginState = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("inviteToken");
  const prefilledEmail = searchParams.get("email") ?? "";
  const [form, setForm] = useState<LoginState>({
    email: prefilledEmail,
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "Unable to sign in.");
        return;
      }

      const nextPath = searchParams.get("next") || "/dashboard/news";
      router.push(nextPath);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ql-bg)] px-6 py-12">
      <section className="ql-panel w-full max-w-md rounded-2xl p-8 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
        <h1 className="ql-title text-2xl font-semibold">Sign in</h1>
        <p className="ql-subtitle mt-2 text-sm">
          Use your ICQ Labs account credentials.
        </p>

        {inviteToken ? (
          <div className="mt-4 rounded-lg border border-[var(--ql-border)] bg-[rgba(212,175,55,0.12)] p-3 text-sm text-[var(--ql-text)]">
            <p>
              You have an invite token. Complete onboarding before signing in.
            </p>
            <a
              className="mt-1 inline-block font-medium text-[var(--ql-gold)] underline"
              href={`/invite/accept?token=${encodeURIComponent(inviteToken)}`}
            >
              Continue invite setup
            </a>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--ql-text-muted)]">
              Email
            </span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className="ql-input w-full rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--ql-text-muted)]">
              Password
            </span>
            <input
              required
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="ql-input w-full rounded-lg px-3 py-2 text-sm"
            />
          </label>

          {error ? (
            <p className="text-sm text-[var(--ql-danger)]">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="ql-btn-primary w-full rounded-lg px-4 py-2 text-sm disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--ql-text-muted)]">
          Forgot password?{" "}
          <a className="ql-link font-medium" href="/reset-password">
            Reset it
          </a>
        </p>
      </section>
    </main>
  );
}
