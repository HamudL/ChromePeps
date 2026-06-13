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
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="mr-6 font-display text-lg font-semibold tracking-tight"
          >
            {APP_NAME}
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Mein Konto
          </span>
          <div className="ml-auto hidden text-sm text-muted-foreground sm:block">
            {session.user.email}
          </div>
        </div>
      </header>

      <ResearchBanner />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="eyebrow">Konto</span>
          <h1 className="display-title mt-2 text-2xl md:text-3xl">
            Mein Konto
          </h1>
        </div>
        <div className="flex flex-col gap-8 lg:flex-row">
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
