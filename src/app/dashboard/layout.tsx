import Link from "next/link";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { APP_NAME } from "@/lib/constants";
import { DashboardNav } from "./dashboard-nav";
import { EmailVerifyBanner } from "@/components/dashboard/email-verify-banner";
import { ResearchBanner } from "@/components/layout/research-banner";

export const metadata = {
  // Kein "| ChromePeps"-Suffix — den hängt das title-Template des
  // Root-Layouts automatisch an (sonst doppelter Brand-Suffix).
  title: "Mein Konto",
};

/**
 * dashboard/layout — „Laborjournal des Kunden".
 *
 * Schlanke Konto-Kopfzeile (Brand, Bereichs-Label, E-Mail in Mono),
 * darunter ein Seitenkopf mit Fraunces-Titel + Mono-Metadaten und
 * Mess-Lineal. Navigation links als Protokoll-Index mit
 * Ordnungsnummern; Inhalte rechts.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  // Soft enforcement for email verification: look up the latest state from
  // the DB (the JWT doesn't carry `emailVerified`). If null, the banner
  // renders above the dashboard content.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });
  const needsVerify = !!user && !user.emailVerified;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="mr-6 font-display text-lg font-semibold tracking-tight"
          >
            {APP_NAME}
          </Link>
          <span className="mono-label text-muted-foreground">
            Laborjournal
          </span>
          <div className="ml-auto hidden font-mono text-xs text-muted-foreground sm:block">
            {session.user.email}
          </div>
        </div>
      </header>

      <ResearchBanner />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {/* Seitenkopf — Fraunces-Titel + Mono-Metadaten */}
        <div className="mb-8">
          <span className="eyebrow">Konto</span>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h1 className="display-title text-2xl md:text-3xl">Mein Konto</h1>
            <span className="mono-label normal-case tracking-normal text-muted-foreground">
              {session.user.email}
            </span>
          </div>
          <div className="tick-rule mt-5" aria-hidden />
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          <aside className="w-full shrink-0 lg:w-56">
            <DashboardNav />
          </aside>
          <main className="min-w-0 flex-1">
            {needsVerify && user && (
              <EmailVerifyBanner email={user.email} />
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
