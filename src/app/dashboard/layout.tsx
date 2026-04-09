import Link from "next/link";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { APP_NAME } from "@/lib/constants";
import { DashboardNav } from "./dashboard-nav";
import { EmailVerifyBanner } from "@/components/dashboard/email-verify-banner";

export const metadata = {
  title: `My Account | ${APP_NAME}`,
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
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="mr-6 text-lg font-bold tracking-tight">
            {APP_NAME}
          </Link>
          <span className="text-sm text-muted-foreground">My Account</span>
          <div className="ml-auto text-sm text-muted-foreground">
            {session.user.email}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
