"use client";

/**
 * Dashboard error boundary — friendlier than the admin one because
 * customers don't need stack traces, just a way forward.
 */
import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAIL_SUPPORT_ADDRESS } from "@/lib/constants";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error.message, error.stack);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="max-w-md w-full space-y-4 rounded-2xl border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Etwas ist schiefgelaufen</h2>
        <p className="text-sm text-muted-foreground">
          Wir konnten diesen Bereich gerade nicht laden. Versuche es bitte
          erneut — falls der Fehler bleibt, sind wir per E-Mail erreichbar.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Fehler-ID: <code className="font-mono">{error.digest}</code>
          </p>
        )}
        <div className="flex flex-col items-center justify-center gap-2 pt-2 sm:flex-row">
          <Button onClick={reset}>Erneut versuchen</Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Zur Übersicht</Link>
          </Button>
        </div>
        <p className="pt-2 text-xs text-muted-foreground">
          Support:{" "}
          <a
            href={`mailto:${MAIL_SUPPORT_ADDRESS}`}
            className="underline underline-offset-2"
          >
            {MAIL_SUPPORT_ADDRESS}
          </a>
        </p>
      </div>
    </div>
  );
}
