"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  profile: {
    major: string | null;
    graduationYear: number | null;
    joinedAt: string;
    isActive: boolean;
  } | null;
};

type MembersPayload = {
  data: Member[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export function MemberDirectory() {
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (q.trim()) {
        params.set("q", q.trim());
      }
      if (active === "true" || active === "false") {
        params.set("active", active);
      }

      const response = await fetch(`/api/v1/members?${params.toString()}`, {
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | MembersPayload
        | { error?: { message?: string } }
        | null;

      if (!response.ok || !payload || !("data" in payload)) {
        setError(
          (payload as { error?: { message?: string } } | null)?.error
            ?.message ?? "Unable to load members",
        );
        return;
      }

      setMembers(payload.data ?? []);
      setTotal(payload.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="ql-panel mt-8 rounded-xl p-5 shadow-[0_14px_32px_rgba(0,0,0,0.34)]">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--ql-text-muted)]">
            Search
          </span>
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Name or email"
            className="ql-input w-full rounded-lg px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--ql-text-muted)]">
            Active
          </span>
          <select
            value={active}
            onChange={(event) => setActive(event.target.value)}
            className="ql-select w-full rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setPage(1);
            void load();
          }}
          className="ql-btn-primary h-10 rounded-lg px-4 text-sm"
        >
          Apply
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[var(--ql-danger)]">{error}</p>
      ) : null}
      {loading ? (
        <p className="mt-4 text-sm text-[var(--ql-text-muted)]">
          Loading members...
        </p>
      ) : null}

      {!loading ? (
        <div className="mt-4 overflow-x-auto">
          <table className="ql-table min-w-full divide-y text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--ql-text-subtle)]">
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Major</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(90,69,18,0.45)]">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-2 py-2 text-[var(--ql-text)]">
                    {member.fullName ?? "-"}
                  </td>
                  <td className="px-2 py-2 text-[var(--ql-text-muted)]">
                    {member.email}
                  </td>
                  <td className="px-2 py-2 text-[var(--ql-text-muted)]">
                    {member.role}
                  </td>
                  <td className="px-2 py-2 text-[var(--ql-text-muted)]">
                    {member.profile?.major ?? "-"}
                  </td>
                  <td className="px-2 py-2 text-[var(--ql-text-muted)]">
                    {member.profile?.isActive ? "Active" : "Inactive"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-[var(--ql-text-subtle)]">
          {total} member(s)
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
