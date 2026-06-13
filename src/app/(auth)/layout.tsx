import Link from "next/link";
import { LogoIcon } from "@/components/brand/logo-icon";
import { APP_NAME } from "@/lib/constants";
import { ResearchBanner } from "@/components/layout/research-banner";
import { FlaskConical, Lock, ScanLine } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Account",
    template: `%s | ${APP_NAME}`,
  },
  robots: { index: false, follow: false },
};

/**
 * (auth)/layout — „Zugangs-Dossier"-Rahmen für alle Auth-Seiten.
 *
 * Zweispaltig auf Desktop: links ein dunkles Ink-Panel (Marke, Claim,
 * Specimen-Tags als Vertrauenssignal), rechts das ruhige Formular auf
 * kaltem Papier. Auf Mobil gestapelt — das Ink-Panel schrumpft zur
 * kompakten Brand-Kopfzeile über der Karte.
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
        {/* Linkes Ink-Panel — Brand + Vertrauen. Auf Mobil als kompakte
            Kopfzeile, auf Desktop volle Höhe mit redaktionellem Layout. */}
        <aside className="section-ink grain-overlay relative isolate flex flex-col overflow-hidden px-6 py-10 lg:px-14 lg:py-16">
          {/* Feines Mess-Raster als ruhige Tiefe — kein Glow-Theater. */}
          <div
            className="apo-grid pointer-events-none absolute inset-0 opacity-60"
            aria-hidden
          />

          {/* Brand + Dossier-Kennung */}
          <div className="relative z-10 flex items-start justify-between gap-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-3 self-start"
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
            <span className="mono-tag hidden text-ink-muted lg:block">
              Dossier · Zugang
            </span>
          </div>

          {/* Editorial-Block (nur Desktop sichtbar mit voller Höhe) */}
          <div className="relative z-10 mt-auto hidden pt-16 lg:block">
            <span className="eyebrow">Verifiziertes Labor</span>
            <p className="display-title mt-4 max-w-md text-3xl leading-tight text-ink-foreground">
              Gemessen, <em>nicht versprochen.</em>
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              Jede Charge erhält eine Lot-Nummer und ein HPLC-Chromatogramm
              von Janoshik Analytical. Dein Konto bündelt Bestellverlauf,
              Adressen und das CoA-Archiv an einem Ort.
            </p>

            <div className="tick-rule mt-8 max-w-md" aria-hidden />

            <ul className="mt-8 grid max-w-md grid-cols-3 gap-4">
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

            {/* Specimen-Tags — Vertrauen in Proben-Etikett-Form */}
            <ul className="mt-8 flex max-w-md flex-wrap gap-2">
              <li className="trust-pill">
                <FlaskConical className="h-3 w-3" aria-hidden />
                Research Use Only
              </li>
              <li className="trust-pill">
                <ScanLine className="h-3 w-3" aria-hidden />
                CoA je Charge
              </li>
              <li className="trust-pill">
                <Lock className="h-3 w-3" aria-hidden />
                Verschlüsselter Zugang
              </li>
            </ul>
          </div>

          {/* Mobil-Subline (kompakt, unter dem Logo) */}
          <p className="relative z-10 mt-4 text-sm text-ink-muted lg:hidden">
            Bestellverlauf, Adressen und CoA-Archiv an einem Ort.
          </p>
        </aside>

        {/* Rechte Spalte — Formular auf kaltem Papier */}
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
