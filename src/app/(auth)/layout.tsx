import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Account",
    template: `%s | ${APP_NAME}`,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 chrome-gradient">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <FlaskConical className="h-6 w-6 text-primary" />
            </div>
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
  );
}
