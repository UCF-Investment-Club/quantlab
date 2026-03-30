import { UserRoleManager } from "@/components/admin/user-role-manager";

export default function AdminUsersPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 text-[var(--ql-text)]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ql-gold)]">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--ql-text)]">
          User Roles
        </h1>
        <p className="mt-3 text-sm text-[var(--ql-text-muted)]">
          Change user roles and synchronize role claims used for policy
          enforcement.
        </p>
      </header>

      <UserRoleManager />
    </main>
  );
}
