"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/store/cookie-consent-store";

export function CookieBanner() {
  const decision = useCookieConsent((s) => s.decision);
  const accept = useCookieConsent((s) => s.accept);
  const reject = useCookieConsent((s) => s.reject);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — the persisted Zustand store is client-only.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || decision !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie-Hinweis"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-lg border bg-background shadow-lg">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <div className="shrink-0 rounded-full bg-primary/10 p-2">
            <Cookie className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold">
              Cookies &amp; Datenschutz
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Wir verwenden ausschließlich technisch notwendige Cookies, die für
              Login, Warenkorb und Checkout erforderlich sind. Für weitere
              Informationen lesen Sie bitte unsere{" "}
              <Link href="/datenschutz" className="underline">
                Datenschutzerklärung
              </Link>
              .
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={accept}
                className="text-xs"
              >
                Akzeptieren
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={reject}
                className="text-xs"
              >
                Ablehnen
              </Button>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-xs"
              >
                <Link href="/datenschutz">Mehr erfahren</Link>
              </Button>
            </div>
          </div>
          <button
            onClick={reject}
            aria-label="Cookie-Hinweis schließen"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
