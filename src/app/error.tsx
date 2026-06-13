"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Page-level error boundary — catches errors in page components.
 * In development, shows full error message + stack trace for debugging.
 * In production, shows only a generic message and the digest (for support
 * reference) so we don't leak internal paths, module names, or query shapes.
 */
const isDev = process.env.NODE_ENV === "development";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-Render-Crashes landen sonst nur in der Browser-Konsole des
    // Users — onRequestError fängt nur server-seitige Throws.
    Sentry.captureException(error);
  }, [error]);

  console.error("[PageError]", error.message, error.stack);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg border border-border bg-card p-8 sm:p-10">
        {/* Protokoll-Kopfzeile */}
        <div className="flex items-baseline justify-between gap-4">
          <span className="mono-label text-muted-foreground">
            Analyse-Protokoll
          </span>
          <span className="mono-label text-destructive">Laufzeitfehler</span>
        </div>
        <div className="tick-rule mt-4" aria-hidden="true" />

        <h2 className="display-title mt-6 text-3xl">
          Messung <em className="text-primary-strong">unterbrochen</em>.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {isDev
            ? error.message || "Ein unerwarteter Fehler ist aufgetreten."
            : "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support."}
        </p>
        {error.digest && (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Referenz: <code className="normal-case">{error.digest}</code>
          </p>
        )}
        {isDev && error.stack && (
          <pre className="mt-5 max-h-60 overflow-auto border border-ink-border bg-ink p-4 text-left font-mono text-xs leading-relaxed text-ink-foreground">
            {error.stack}
          </pre>
        )}
        <button
          onClick={reset}
          className="btn-gold mt-7"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
