"use client";

import { useState } from "react";

import type { Role } from "@/lib/auth/policy";

const ROLE_OPTIONS: Role[] = ["MEMBER", "OFFICER", "ADMIN"];

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    setInviteLink(null);

    try {
      const response = await fetch("/api/v1/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const payload = (await response.json().catch(() => null)) as {
        data?: { inviteLink?: string; note?: string };
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "Unable to create invite");
        return;
      }

      setMessage(payload?.data?.note ?? "Invite created");
      setInviteLink(payload?.data?.inviteLink ?? null);
      setEmail("");
      setRole("MEMBER");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ql-panel mt-8 rounded-xl p-5 shadow-[0_14px_32px_rgba(0,0,0,0.34)]">
      <h2 className="text-lg font-semibold text-[var(--ql-text)]">
        Create Invite
      </h2>

      <form
        onSubmit={onSubmit}
        className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--ql-text-muted)]">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="ql-input w-full rounded-lg px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--ql-text-muted)]">
            Role
          </span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="ql-select w-full rounded-lg px-3 py-2 text-sm"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="ql-btn-primary h-10 rounded-lg px-4 text-sm disabled:opacity-60"
        >
          {loading ? "Sending..." : "Invite"}
        </button>
      </form>

      {message ? (
        <p className="mt-3 text-sm text-[var(--ql-success)]">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-[var(--ql-danger)]">{error}</p>
      ) : null}

      {inviteLink ? (
        <div className="ql-panel-soft mt-3 rounded-lg p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ql-gold)]">
            One-time Invite Link
          </p>
          <p className="mt-2 break-all text-sm text-[var(--ql-text-muted)]">
            {inviteLink}
          </p>
        </div>
      ) : null}
    </section>
  );
}
