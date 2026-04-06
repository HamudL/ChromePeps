import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { APP_NAME } from "@/lib/constants";
import { DashboardNav } from "@/components/admin/dashboard-nav";
import { Separator } from "@/components/ui/separator";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Admin Panel",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Shield className="h-5 w-5 text-primary" />
          <Link href="/admin" className="font-bold tracking-tight chrome-text">
            Admin Panel
          </Link>
        </div>
        <div className="flex-1 px-4 py-4">
          <DashboardNav />
        </div>
        <div className="border-t px-4 py-3">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to {APP_NAME}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="flex h-16 items-center justify-between border-b px-6 bg-background">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-semibold chrome-text">
              {APP_NAME} Admin
            </h1>
          </div>
          {/* Mobile nav links */}
          <nav className="flex md:hidden items-center gap-4 text-sm">
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/products"
              className="text-muted-foreground hover:text-foreground"
            >
              Products
            </Link>
            <Link
              href="/admin/orders"
              className="text-muted-foreground hover:text-foreground"
            >
              Orders
            </Link>
          </nav>
        </header>
        <main className="flex-1 p-6 bg-muted/10">{children}</main>
      </div>
    </div>
  );
}
