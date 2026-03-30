import { MemberDirectory } from "@/components/members/member-directory";

export default function MembersPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 text-[var(--ql-text)]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ql-gold)]">
          Members
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--ql-text)]">
          Member Directory
        </h1>
        <p className="mt-3 text-sm text-[var(--ql-text-muted)]">
          Search and browse members with role-aware access controls.
        </p>
      </header>

      <MemberDirectory />
    </main>
  );
}
