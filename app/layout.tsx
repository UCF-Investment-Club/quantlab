import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { getSessionUser } from "@/lib/auth/session";
import { getNavForRole } from "@/lib/navigation/nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ICQ Labs",
  description: "ICQ Labs platform foundation",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser = await getSessionUser();
  const navItems = sessionUser ? getNavForRole(sessionUser.role) : [];

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--ql-bg)] text-[var(--ql-text)]">
        {sessionUser ? (
          <header className="sticky top-0 z-20 border-b border-[var(--ql-border)] bg-[rgba(6,6,6,0.92)] backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
              <div className="flex items-center gap-5">
                <Link
                  href="/dashboard/news"
                  className="text-sm font-semibold tracking-wide text-[var(--ql-gold)]"
                >
                  ICQ Labs
                </Link>
                <nav className="flex items-center gap-3">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-md px-2 py-1 text-sm font-medium text-[var(--ql-text-muted)] transition-colors hover:bg-[var(--ql-surface-soft)] hover:text-[var(--ql-gold)]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[var(--ql-gold)] bg-[var(--ql-gold)] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-black">
                  {sessionUser.role}
                </span>
                <LogoutButton />
              </div>
            </div>
          </header>
        ) : null}

        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
