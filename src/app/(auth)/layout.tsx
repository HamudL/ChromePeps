import Link from "next/link";
import { LogoIcon } from "@/components/brand/logo-icon";
import { APP_NAME } from "@/lib/constants";
import { ResearchBanner } from "@/components/layout/research-banner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Account",
    template: `%s | ${APP_NAME}`,
  },
  robots: { index: false, follow: false },
};

/**
 * (auth)/layout — "Cinematic Lab"-Rahmen für alle Auth-Seiten.
 *
 * Zweispaltig auf Desktop: links ein dunkles Ink-Panel (Brand, Trust-
 * Signale, Film-Grain + feines Lab-Grid) als bewusster Kontrast, rechts
 * das Formular auf warmem hellem Grund. Auf Mobil gestapelt — das Ink-
 * Panel schrumpft zur kompakten Brand-Kopfzeile über der Karte.
 *
 * Die Auth-Seiten selbst rendern weiter ihre eigene <Card> (kein
 * Eingriff in deren sensiblen Client-State). Dieser Rahmen ist rein
 * strukturell/visuell.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ResearchBanner />
      <div className="grid min-h-[calc(100vh-2.5rem)] lg:grid-cols-[minmax(0,42%)_minmax(0,58%)]">
        {/* Linkes Ink-Panel — Brand + Trust. Auf Mobil als kompakte
            Kopfzeile, auf Desktop volle Höhe mit redaktionellem Layout. */}
        <aside className="section-ink grain-overlay relative isolate flex flex-col overflow-hidden px-6 py-10 lg:px-14 lg:py-16">
          {/* Feines Lab-Grid + sanfter Gold-Schimmer als Tiefe */}
          <div
            className="apo-grid pointer-events-none absolute inset-0 opacity-60"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />

          {/* Brand */}
          <Link
            href="/"
            className="group relative z-10 inline-flex items-center gap-3 self-start"
          >
            <LogoIcon
              size={44}
              priority
              className="transition-transform group-hover:scale-105"
            />
            <span className="display-title text-xl text-ink-foreground">
              {APP_NAME}
            </span>
          </Link>

          {/* Editorial-Block (nur Desktop sichtbar mit voller Höhe) */}
          <div className="relative z-10 mt-auto hidden pt-16 lg:block">
            <span className="eyebrow">VERIFIZIERTES LABOR</span>
            <p className="display-title mt-4 max-w-md text-3xl leading-tight text-ink-foreground text-balance">
              Gemessen, nicht versprochen.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              Jede Charge erhält eine Lot-Nummer und ein HPLC-Chromatogramm
              von Janoshik Analytical. Dein Konto bündelt Bestellverlauf,
              Adressen und das CoA-Archiv an einem Ort.
            </p>

            <hr className="rule-gold my-8 max-w-md" />

            <ul className="grid max-w-md grid-cols-3 gap-4">
              <li>
                <div className="stat-value text-2xl">HPLC</div>
                <div className="stat-key mt-1">Janoshik-Analyse</div>
              </li>
              <li>
                <div className="stat-value text-2xl">Lot</div>
                <div className="stat-key mt-1">Rückverfolgbar</div>
              </li>
              <li>
                <div className="stat-value text-2xl">2FA</div>
                <div className="stat-key mt-1">Konto-Schutz</div>
              </li>
            </ul>
          </div>

          {/* Mobil-Subline (kompakt, unter dem Logo) */}
          <p className="relative z-10 mt-4 text-sm text-ink-muted lg:hidden">
            Bestellverlauf, Adressen und CoA-Archiv an einem Ort.
          </p>
        </aside>

        {/* Rechte Spalte — Formular auf hellem Grund */}
        <main className="hero-ambient relative flex flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
          <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
            {children}

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <span aria-hidden>&larr;</span> Zurück zum Shop
              </Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
