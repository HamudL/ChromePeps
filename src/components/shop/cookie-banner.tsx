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
      {/* Eckige Ink-Karte im Protokoll-Stil — card-ink rescoped die
          Akzent-Tokens auf helles Mint (globals.css). */}
      <div className="card-ink mx-auto max-w-3xl border border-ink-border bg-ink text-ink-foreground shadow-[0_20px_60px_-30px_hsl(218_35%_5%/0.9)]">
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <Cookie
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-sm font-semibold">
                Cookies &amp; Datenschutz
              </h2>
              <span className="mono-tag hidden text-ink-muted sm:inline">
                Consent-Protokoll
              </span>
            </div>
            <div className="tick-rule mt-3" aria-hidden="true" />
            {/* Text muss zur tatsächlichen Technik passen: "Akzeptieren"
                lädt Google Analytics 4 (components/analytics/
                google-analytics.tsx gated auf decision === "accepted") —
                das Banner darf also nicht behaupten, es gäbe ausschließlich
                notwendige Cookies. */}
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              Wir verwenden technisch notwendige Cookies für Login, Warenkorb
              und Checkout. Statistik-Cookies (Google Analytics) setzen wir
              nur mit Ihrer Einwilligung — also erst, wenn Sie auf
              &bdquo;Akzeptieren&ldquo; klicken. Bei &bdquo;Ablehnen&ldquo;
              bleibt es bei den notwendigen Cookies. Details finden Sie in
              unserer{" "}
              <Link
                href="/datenschutz"
                className="text-ink-foreground underline underline-offset-2 hover:text-primary"
              >
                Datenschutzerklärung
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="gold"
                onClick={accept}
                className="text-xs"
              >
                Akzeptieren
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={reject}
                className="border-ink-border bg-transparent text-xs text-ink-foreground hover:border-primary/50 hover:bg-white/5 hover:text-ink-foreground"
              >
                Ablehnen
              </Button>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-xs text-ink-muted hover:bg-white/5 hover:text-ink-foreground"
              >
                <Link href="/datenschutz">Mehr erfahren</Link>
              </Button>
            </div>
          </div>
          <button
            onClick={reject}
            aria-label="Cookie-Hinweis schließen"
            className="shrink-0 p-1 text-ink-muted transition-colors hover:text-ink-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
