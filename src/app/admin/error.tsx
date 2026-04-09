"use client";

/**
 * Admin segment error boundary — catches errors anywhere inside `/admin/*`.
 * Admins need the stack trace to triage issues quickly, so we always show
 * the digest and (in dev) the full stack. The root error.tsx is still the
 * fallback if this boundary itself fails.
 */
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error.message, error.stack);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-xl w-full space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold">Admin-Bereich: Fehler</h2>
        <p className="text-muted-foreground">
          {error.message || "Ein unerwarteter Fehler ist aufgetreten."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Digest: <code className="font-mono">{error.digest}</code>
          </p>
        )}
        {error.stack && (
          <pre className="mt-4 max-h-60 overflow-auto rounded-lg bg-muted p-4 text-left text-xs">
            {error.stack}
          </pre>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button onClick={reset}>Erneut versuchen</Button>
          <Button variant="outline" asChild>
            <Link href="/admin">Zurück zum Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
