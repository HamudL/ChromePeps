import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

/**
 * 404 — als Analyse-Protokoll inszeniert: „Probe nicht gefunden".
 * Statische Server-Component, rendert ohne Shop-Header (Root-Segment).
 */
export default function NotFound() {
  return (
    <div className="hero-ambient flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="relative w-full max-w-md">
        <div className="border border-border bg-card p-8 sm:p-10">
          {/* Protokoll-Kopfzeile */}
          <div className="flex items-baseline justify-between gap-4">
            <span className="mono-label text-muted-foreground">
              Analyse-Protokoll
            </span>
            <span className="mono-label text-destructive">Fehler 404</span>
          </div>
          <div className="tick-rule mt-4" aria-hidden="true" />

          <p className="index-ghost mt-6 text-7xl sm:text-8xl" aria-hidden="true">
            404
          </p>
          <h1 className="display-title mt-2 text-3xl sm:text-4xl">
            Probe nicht <em className="text-primary-strong">gefunden</em>.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Die angeforderte Seite existiert nicht, wurde verschoben oder
            befindet sich vorübergehend nicht im Sortiment. Der Katalog führt
            alle freigegebenen Chargen.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="gold" className="gap-2">
              <Link href="/products">
                Katalog ansehen
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Zur Startseite</Link>
            </Button>
          </div>

          <div className="mt-10 border-t border-border pt-5">
            <dl className="space-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <div className="flex items-baseline justify-between gap-6">
                <dt>Befund</dt>
                <dd>Kein Treffer im Index</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt>Support</dt>
                <dd>
                  <Link
                    href="/kontakt"
                    className="text-primary-strong underline-offset-2 hover:underline"
                  >
                    Kontakt aufnehmen
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-3 w-3" />
            Zurück
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            &copy; {new Date().getFullYear()} {APP_NAME}
          </p>
        </div>
      </div>
    </div>
  );
}
