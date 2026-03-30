"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type VerifyState =
  | "idle"
  | "loading"
  | "active"
  | "missing"
  | "expired"
  | "accepted"
  | "error";

export default function InviteAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [role, setRole] = useState<string | null>(null);
  const [emailMasked, setEmailMasked] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      verifyState === "active" &&
      fullName.trim().length > 0 &&
      password.length >= 8,
    [verifyState, fullName, password],
  );

  useEffect(() => {
    async function verifyInvite() {
      if (!token) {
        setVerifyState("missing");
        return;
      }

      setVerifyState("loading");
      setError(null);

      const response = await fetch(
        `/api/v1/members/invite/verify?token=${encodeURIComponent(token)}`,
      );
      const payload = (await response.json().catch(() => null)) as {
        data?: {
          state?: VerifyState;
          invite?: { role?: string; emailMasked?: string } | null;
        };
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setVerifyState("error");
        setError(payload?.error?.message ?? "Unable to verify invite");
        return;
      }

      const state = payload?.data?.state ?? "missing";
      setVerifyState(state);
      setRole(payload?.data?.invite?.role ?? null);
      setEmailMasked(payload?.data?.invite?.emailMasked ?? null);
    }

    void verifyInvite();
  }, [token]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/v1/members/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fullName, password }),
      });

      const payload = (await response.json().catch(() => null)) as {
        data?: {
          email?: string;
        };
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        const message = payload?.error?.message ?? "Unable to accept invite";

        if (/already been used|already used/i.test(message)) {
          setError(
            "This invite was already used. Request a new invite from an admin.",
          );
          return;
        }

        if (/expired/i.test(message)) {
          setError(
            "This invite has expired. Request a new invite from an admin.",
          );
          return;
        }

        if (/invalid/i.test(message)) {
          setError(
            "This invite link is invalid. Check the URL or request a new invite.",
          );
          return;
        }

        setError(message);
        return;
      }

      const acceptedEmail = payload?.data?.email ?? null;
      setInvitedEmail(acceptedEmail);
      setSuccess("Account created. Redirecting to sign in...");
      setTimeout(() => {
        const next = acceptedEmail
          ? `/login?email=${encodeURIComponent(acceptedEmail)}`
          : "/login";
        router.push(next);
      }, 900);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ql-bg)] px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-[var(--ql-border)] bg-[var(--ql-surface)] p-8 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
        <h1 className="text-2xl font-semibold text-[var(--ql-text)]">
          Accept Invite
        </h1>

        {verifyState === "loading" ? (
          <p className="mt-3 text-sm text-[var(--ql-text-muted)]">
            Validating invite...
          </p>
        ) : null}
        {verifyState === "missing" ? (
          <p className="mt-3 text-sm text-[var(--ql-danger)]">
            Invite token is missing.
          </p>
        ) : null}
        {verifyState === "expired" ? (
          <p className="mt-3 text-sm text-[var(--ql-danger)]">
            Invite has expired.
          </p>
        ) : null}
        {verifyState === "accepted" ? (
          <p className="mt-3 text-sm text-[var(--ql-danger)]">
            Invite has already been used.
          </p>
        ) : null}
        {verifyState === "error" ? (
          <p className="mt-3 text-sm text-[var(--ql-danger)]">
            {error ?? "Invalid invite."}
          </p>
        ) : null}

        {verifyState === "active" ? (
          <>
            <p className="mt-3 text-sm text-[var(--ql-text-muted)]">
              Invited account:{" "}
              <span className="font-medium text-[var(--ql-text)]">
                {emailMasked ?? "-"}
              </span>
            </p>
            <p className="mt-1 text-sm text-[var(--ql-text-muted)]">
              Assigned role:{" "}
              <span className="font-medium text-[var(--ql-text)]">
                {role ?? "MEMBER"}
              </span>
            </p>

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--ql-text-muted)]">
                  Full name
                </span>
                <input
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-lg border border-[var(--ql-border)] bg-[var(--ql-surface-soft)] px-3 py-2 text-sm text-[var(--ql-text)] outline-none placeholder:text-[var(--ql-text-subtle)] focus:border-[var(--ql-gold)] focus:ring-2 focus:ring-[color:var(--ql-gold-glow)]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--ql-text-muted)]">
                  Password
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
                disabled={!canSubmit || submitting}
                className="w-full rounded-lg bg-[var(--ql-gold)] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[var(--ql-gold-strong)] disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Create account"}
              </button>
            </form>
          </>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-[var(--ql-danger)]">{error}</p>
        ) : null}
        {success ? (
          <p className="mt-4 text-sm text-[var(--ql-success)]">
            {success}
            {invitedEmail ? ` (${invitedEmail})` : ""}
          </p>
        ) : null}
      </section>
    </main>
  );
}
