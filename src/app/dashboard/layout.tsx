import { requireAuth } from "@/lib/auth-helpers";
import { APP_NAME } from "@/lib/constants";
import { DashboardNav } from "./dashboard-nav";

export const metadata = {
  title: `My Account | ${APP_NAME}`,
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <a href="/" className="mr-6 text-lg font-bold tracking-tight">
            {APP_NAME}
          </a>
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
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
