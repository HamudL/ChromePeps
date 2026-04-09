"use client";

/**
 * Checkout error boundary — users who hit an error mid-checkout are in the
 * worst possible UX spot (they trust us with their money). Keep the message
 * calm, point them back to the cart, and make it obvious they can retry
 * without losing their cart contents.
 */
import { useEffect } from "react";
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
    console.error("[CheckoutError]", error.message, error.stack);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-12">
      <div className="max-w-lg w-full space-y-5 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <ShieldAlert className="h-7 w-7 text-amber-700" />
        </div>
        <h1 className="text-2xl font-bold">Checkout unterbrochen</h1>
        <p className="text-sm text-muted-foreground">
          Beim Abschluss deiner Bestellung ist leider ein Fehler aufgetreten.
          Dein Warenkorb ist noch vollständig — du kannst den Vorgang gefahrlos
          wiederholen. Es wurde noch <strong>nichts</strong> abgebucht.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Fehler-ID: <code className="font-mono">{error.digest}</code>
          </p>
        )}
        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Button onClick={reset}>Nochmal versuchen</Button>
          <Button variant="outline" asChild>
            <Link href="/products">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Zurück zum Shop
            </Link>
          </Button>
        </div>
        <p className="pt-4 text-xs text-muted-foreground">
          Problem tritt weiter auf? Melde dich bei{" "}
          <a
            href={`mailto:${MAIL_SUPPORT_ADDRESS}`}
            className="underline underline-offset-2"
          >
            {MAIL_SUPPORT_ADDRESS}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
