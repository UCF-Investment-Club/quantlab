export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ql-bg)] px-6 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-[var(--ql-border)] bg-[var(--ql-surface)] p-8 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--ql-gold)]">
          Access Denied
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--ql-text)]">
          You do not have access to this page.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--ql-text-muted)]">
          Your account does not currently have permission to view this route. If
          you believe this is an error, contact an administrator.
        </p>
      </section>
    </main>
  );
}
