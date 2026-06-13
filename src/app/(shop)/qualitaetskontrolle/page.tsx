import Link from "next/link";
import {
  ShieldCheck,
  Eye,
  Mail,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { SectionBlur } from "@/components/layout/section-blur";

export const metadata: Metadata = {
  // Kein "| ChromePeps"-Suffix — den hängt das title-Template des
  // Root-Layouts automatisch an (sonst doppelter Brand-Suffix).
  title: "Qualitätskontrolle",
  description:
    "Unser Qualitätskontrollprozess: Jede Charge wird durch das unabhängige Analyselabor Janoshik auf Reinheit getestet.",
  alternates: { canonical: "/qualitaetskontrolle" },
};

// Die vier Stationen der Mess-Strecke — von Wareneingang bis
// Veröffentlichung. Nummern statt Icon-Deko: das Protokoll zählt.
const steps = [
  {
    title: "Chargen-Eingang",
    description:
      "Jede neue Charge wird bei Eingang separat in einem Laborgefrierschrank bei −24 °C gelagert und erhält eine eindeutige Lot-Nummer — lückenlose Rückverfolgbarkeit vom Eingang bis zum Versand.",
  },
  {
    title: "Janoshik HPLC-Analyse",
    description:
      "Eine Probe der Charge geht an das unabhängige Analyselabor Janoshik und wird dort per HPLC (Hochleistungsflüssigkeitschromatographie) auf Reinheit und Identität geprüft.",
  },
  {
    title: "Freigabe",
    description:
      "Nur Chargen, die den Janoshik-Test bestehen und unsere Qualitätsstandards erfüllen, werden zur Verpackung und zum Verkauf freigegeben. Alles andere geht nicht in den Versand.",
  },
  {
    title: "Veröffentlichung & Verifikation",
    description:
      "Jedes Testergebnis wird veröffentlicht und kann über seine Task-ID unter janoshik.com/verification unabhängig gegengeprüft werden — von jedem, jederzeit.",
  },
];

export default function QualitaetskontrollePage() {
  return (
    <div className="flex flex-col">
      {/* ── Hero (hell) ── einspaltig. Hier stand früher rechts ein
          HplcSpectrum-Panel mit ERFUNDENEN Demo-Messwerten (99,24 % /
          6,48 min / Lot CP-2411-BPC), die wie eine echte Janoshik-Messung
          aussahen. Ausblenden statt faken: das Panel kommt erst zurück,
          wenn echte Chargen-Messdaten übergeben werden können. */}
      <section className="hero-ambient border-b border-border/60">
        <div className="container relative section-pad">
          <div className="max-w-3xl">
            <span className="eyebrow">Qualitätskontrolle</span>
            <h1 className="display-title mt-4 text-4xl md:text-5xl lg:text-6xl">
              Gemessen, <em>nicht versprochen.</em>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Jede neue Charge geht an Janoshik Labs. Erst nach
              HPLC-Freigabe geht sie in den Versand — ohne Ausnahme.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-7">
              <Button asChild variant="gold" size="xl" className="gap-2">
                <Link href="/products">
                  Produkte entdecken
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="gap-2">
                <a
                  href="https://janoshik.com/verification"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Janoshik-Verifikation
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-7">
              <span className="trust-pill">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-strong" aria-hidden />
                Janoshik HPLC
              </span>
              <span className="trust-pill">
                <Eye className="h-3.5 w-3.5 text-primary-strong" aria-hidden />
                Öffentlich verifizierbar
              </span>
              <span className="trust-pill">
                <Mail className="h-3.5 w-3.5 text-primary-strong" aria-hidden />
                CoA per E-Mail
              </span>
            </div>
          </div>
          <div className="tick-rule mt-12" aria-hidden />
        </div>
      </section>

      {/* ── Mess-Strecke ── die vier Stationen als nummeriertes
          Protokoll: Ghost-Index links, Haarlinie pro Station. */}
      <section className="container section-pad">
        <header className="max-w-2xl">
          <span className="eyebrow">Der Ablauf</span>
          <h2 className="display-title mt-3 text-2xl md:text-3xl">
            Von der Charge zur Freigabe
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vier Stationen, ein Protokoll — jede Charge durchläuft sie in
            dieser Reihenfolge.
          </p>
        </header>

        <ol className="mt-10 max-w-3xl border-b border-border">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="reveal-up grid grid-cols-[64px_1fr] items-start gap-5 border-t border-border py-8 sm:grid-cols-[104px_1fr] sm:gap-8"
              style={
                i > 0
                  ? ({ ["--fade-delay"]: `${i * 0.06}s` } as React.CSSProperties)
                  : undefined
              }
            >
              <span
                aria-hidden
                className="index-ghost text-5xl sm:text-7xl"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="mono-tag text-primary-strong">
                  Station {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Verifikation & CoA (Ink) ── der Kontrastmoment: prüfen
          statt glauben. Links die Gegenprüfung beim Labor, rechts die
          CoA-Zusage für jede Bestellung. */}
      <SectionBlur />
      <section className="section-ink grain-overlay relative">
        <div className="container relative z-10 section-pad">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div className="max-w-xl">
              <span className="eyebrow">Verifikation</span>
              <h2 className="display-title mt-3 text-3xl md:text-4xl">
                Prüfen Sie selbst.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted md:text-[15px]">
                Jeder Janoshik-Report trägt eine eindeutige Task-ID. Geben
                Sie sie auf der Verifikationsseite des Labors ein und Sie
                sehen das Original-Ergebnis — unabhängig von uns, direkt
                an der Quelle.
              </p>
              <div className="pt-6">
                <Button asChild variant="gold" size="lg" className="gap-2">
                  <a
                    href="https://janoshik.com/verification"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Janoshik-Verifikation öffnen
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* CoA-Zusage — die CoA-Sammlung ist nicht mehr öffentlich:
                der Befund der gelieferten Charge kommt automatisch per
                E-Mail mit jeder Bestellung. */}
            <div className="rounded-lg border border-ink-border bg-white/[0.03] p-6">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/15 text-primary">
                  <Mail className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-foreground">
                    CoA mit jeder Bestellung
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Das Analysezertifikat der gelieferten Charge erhalten Sie
                    automatisch per E-Mail zusammen mit Ihrer
                    Bestellbestätigung — keine Anfrage nötig.
                  </p>
                </div>
              </div>
              <div className="tick-rule mt-5" aria-hidden />
              <dl className="mt-4 space-y-2.5">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                    Methode
                  </dt>
                  <dd className="font-mono text-xs text-ink-foreground">
                    HPLC · UV 220 nm
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                    Labor
                  </dt>
                  <dd className="font-mono text-xs text-ink-foreground">
                    Janoshik Analytical
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                    Zustellung
                  </dt>
                  <dd className="font-mono text-xs text-ink-foreground">
                    PDF per E-Mail
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
      <SectionBlur />
    </div>
  );
}
