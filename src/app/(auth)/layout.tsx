import Link from "next/link";
import { LogoIcon } from "@/components/brand/logo-icon";
import { APP_NAME } from "@/lib/constants";
import { ResearchBanner } from "@/components/layout/research-banner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Account",
    template: `%s | ${APP_NAME}`,
  },
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ResearchBanner />
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 chrome-gradient">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Link href="/" className="inline-flex flex-col items-center gap-3 group">
              <LogoIcon size={56} priority className="transition-transform group-hover:scale-105" />
              <span className="text-2xl font-bold tracking-tight chrome-text">
                {APP_NAME}
              </span>
            </Link>
          </div>

          {/* Page Content (login/register card) */}
          <div className="flex justify-center">{children}</div>

          {/* Back to Home */}
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/"
              className="hover:text-foreground transition-colors hover:underline"
            >
              &larr; Back to store
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
