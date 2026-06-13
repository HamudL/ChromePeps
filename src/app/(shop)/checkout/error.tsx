"use client";

/**
 * Checkout error boundary — users who hit an error mid-checkout are in the
 * worst possible UX spot (they trust us with their money). Keep the message
 * calm, point them back to the cart, and make it obvious they can retry
 * without losing their cart contents.
 */
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { ShieldAlert, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAIL_SUPPORT_ADDRESS } from "@/lib/constants";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Checkout ist der geschäftskritischste Pfad — Crashes hier müssen
    // im Sentry-Dashboard auftauchen, nicht still verschwinden.
    Sentry.captureException(error);
    console.error("[CheckoutError]", error.message, error.stack);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-12">
      <div className="w-full max-w-lg border border-border bg-card p-8 sm:p-10">
        {/* Protokoll-Kopfzeile */}
        <div className="flex items-baseline justify-between gap-4">
          <span className="mono-label text-muted-foreground">Checkout</span>
          <span className="mono-label text-destructive">Unterbrochen</span>
        </div>
        <div className="tick-rule mt-4" aria-hidden="true" />

        <div className="mt-6 flex items-start gap-3">
          <ShieldAlert
            className="mt-1 h-5 w-5 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div>
            <h1 className="display-title text-2xl sm:text-3xl">
              Checkout unterbrochen
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Beim Abschluss deiner Bestellung ist leider ein Fehler aufgetreten.
              Dein Warenkorb ist noch vollständig. Du kannst den Vorgang gefahrlos
              wiederholen. Es wurde noch <strong>nichts</strong> abgebucht.
            </p>
            {error.digest && (
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Fehler-ID: <code className="normal-case">{error.digest}</code>
              </p>
            )}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button variant="gold" onClick={reset}>
            Nochmal versuchen
          </Button>
          <Button variant="outline" asChild>
            <Link href="/products">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Zurück zum Shop
            </Link>
          </Button>
        </div>

        <p className="mt-7 border-t border-border pt-4 text-xs text-muted-foreground">
          Problem tritt weiter auf? Melde dich bei{" "}
          <a
            href={`mailto:${MAIL_SUPPORT_ADDRESS}`}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {MAIL_SUPPORT_ADDRESS}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
