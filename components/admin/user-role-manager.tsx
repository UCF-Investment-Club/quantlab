"use client";

import { useEffect, useState } from "react";

import type { Role } from "@/lib/auth/policy";

type UserRecord = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  status: string;
};

const ROLE_OPTIONS: Role[] = ["MEMBER", "OFFICER", "ADMIN"];

export function UserRoleManager() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/members?page=1&pageSize=100", {
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as {
        data?: UserRecord[];
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "Unable to load users");
        return;
      }

      setUsers(payload?.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function updateRole(id: string, role: Role) {
    setUpdatingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/v1/members/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "Unable to update role");
        return;
      }

      setUsers((previous) =>
        previous.map((user) => (user.id === id ? { ...user, role } : user)),
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <p className="mt-6 text-sm text-[var(--ql-text-muted)]">
        Loading users...
      </p>
    );
  }

  return (
    <section className="ql-panel mt-8 rounded-xl p-5 shadow-[0_14px_32px_rgba(0,0,0,0.34)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--ql-text)]">
          User Roles
        </h2>
        <button
          type="button"
          onClick={() => void loadUsers()}
          className="ql-btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[var(--ql-danger)]">{error}</p>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="ql-table min-w-full divide-y text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--ql-text-subtle)]">
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(90,69,18,0.45)]">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-2 py-2 text-[var(--ql-text)]">
                  {user.fullName ?? "-"}
                </td>
                <td className="px-2 py-2 text-[var(--ql-text-muted)]">
                  {user.email}
                </td>
                <td className="px-2 py-2 text-[var(--ql-text-muted)]">
                  {user.status}
                </td>
                <td className="px-2 py-2">
                  <select
                    value={user.role}
                    disabled={updatingId === user.id}
                    onChange={(event) =>
                      void updateRole(user.id, event.target.value as Role)
                    }
                    className="ql-select rounded-md px-2 py-1 text-sm disabled:opacity-60"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
