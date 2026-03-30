import { InviteForm } from "@/components/admin/invite-form";

export default function AdminInvitesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 text-[var(--ql-text)]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ql-gold)]">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--ql-text)]">
          Invite Members
        </h1>
        <p className="mt-3 text-sm text-[var(--ql-text-muted)]">
          Send role-scoped invites and distribute the generated onboarding link
          to new members.
        </p>
      </header>

      <InviteForm />
    </main>
  );
}
