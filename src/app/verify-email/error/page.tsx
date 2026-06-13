import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  // Kein "| ChromePeps"-Suffix - kommt vom title-Template des Root-Layouts
  // (sonst doppelter Brand-Suffix).
  title: "Bestätigung fehlgeschlagen",
};

const REASON_MESSAGES: Record<string, string> = {
  missing: "Der Bestätigungslink ist unvollständig.",
  invalid: "Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.",
  expired:
    "Dieser Bestätigungslink ist abgelaufen. Bitte fordern Sie einen neuen Link in Ihrem Dashboard an.",
  no_user: "Zu diesem Link wurde kein Konto gefunden.",
};

export default async function VerifyEmailErrorPage(props: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await props.searchParams;
  const message =
    REASON_MESSAGES[reason ?? ""] ??
    "Die Bestätigung ist fehlgeschlagen. Bitte versuchen Sie es erneut.";

  return (
    <div className="hero-ambient flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md border border-border bg-card p-8">
        {/* Protokoll-Kopfzeile */}
        <div className="flex items-baseline justify-between gap-4">
          <span className="mono-label text-muted-foreground">
            E-Mail-Verifikation
          </span>
          <span className="mono-label text-destructive">Fehlgeschlagen</span>
        </div>
        <div className="tick-rule mt-4" aria-hidden="true" />

        <div className="mt-6 flex items-start gap-3">
          <AlertCircle
            className="mt-1 h-5 w-5 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div>
            <h1 className="display-title text-2xl">
              Bestätigung fehlgeschlagen
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {message}
            </p>
          </div>
        </div>

        <p className="mt-5 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
          Wenn Sie bereits eingeloggt sind, können Sie im Dashboard einen neuen
          Bestätigungslink anfordern.
        </p>

        <div className="mt-7 flex flex-col gap-2">
          <Button asChild variant="gold" className="w-full">
            <Link href="/dashboard">Zum Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Zum Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
