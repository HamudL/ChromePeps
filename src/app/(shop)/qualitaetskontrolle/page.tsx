import Link from "next/link";
import {
  ShieldCheck,
  Microscope,
  Package,
  Eye,
  Mail,
  ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  // Kein "| ChromePeps"-Suffix — den hängt das title-Template des
  // Root-Layouts automatisch an (sonst doppelter Brand-Suffix).
  title: "Qualitätskontrolle",
  description:
    "Unser Qualitätskontrollprozess: Jede Charge wird durch das unabhängige Analyselabor Janoshik auf Reinheit getestet.",
  alternates: { canonical: "/qualitaetskontrolle" },
};

const steps = [
  {
    icon: Package,
    title: "Chargen-Handling",
    description:
      "Jede neue Charge wird bei Eingang separat in einem Laborgefrierschrank bei -24\u00B0C gelagert und erhält eine eindeutige Lot-Nummer für lückenlose Rückverfolgbarkeit.",
  },
  {
    icon: Microscope,
    title: "Janoshik HPLC-Analyse",
    description:
      "Jede Charge wird an das unabhängige Analyselabor Janoshik gesendet und dort per HPLC (Hochleistungsflüssigkeitschromatographie) auf Reinheit und Identität geprüft.",
  },
  {
    icon: ShieldCheck,
    title: "Freigabe",
    description:
      "Nur Chargen, die den Janoshik-Test bestehen und unsere Qualitätsstandards erfüllen, werden zur Verpackung und zum Verkauf freigegeben.",
  },
  {
    icon: Eye,
    title: "Transparenz",
    description:
      "Jedes Testergebnis wird veröffentlicht und kann unabhängig auf janoshik.com/verification verifiziert werden. Volle Transparenz für unsere Kunden.",
  },
];

export default function QualitaetskontrollePage() {
  return (
    <div className="flex flex-col">
      {/* Hero (light) — einspaltig. Hier stand früher rechts ein
          HplcSpectrum-Panel mit ERFUNDENEN Demo-Messwerten (99,24 % /
          6,48 min / Lot CP-2411-BPC), die wie eine echte Janoshik-Messung
          aussahen. Ausblenden statt faken: das Panel kommt erst zurück,
          wenn echte Chargen-Messdaten übergeben werden können. */}
      <section className="relative border-b border-border/60">
        <div className="container relative section-pad">
          <div className="max-w-3xl">
            <span className="eyebrow">[ QUALITÄTSKONTROLLE ]</span>
            <h1 className="display-title mt-4 text-4xl md:text-5xl lg:text-6xl">
              Jede Charge. Unabhängig geprüft.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Wir senden jede neue Charge an Janoshik Labs. Erst nach
              HPLC-Freigabe geht sie in den Versand, ohne Ausnahme.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-7">
              {/* Früher gab es hier einen zweiten CTA zur öffentlichen
                  CoA-Sammlung. Die Sammlung ist nicht mehr öffentlich —
                  CoAs werden automatisch mit jeder Bestellung per E-Mail
                  versandt. Daher nur noch der Shop-CTA. */}
              <Button asChild variant="gold" size="xl" className="gap-2">
                <Link href="/products">
                  Produkte entdecken
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-7">
              <span className="trust-pill">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-strong" />
                Janoshik HPLC
              </span>
              <span className="trust-pill">
                <Eye className="h-3.5 w-3.5 text-primary-strong" />
                Öffentlich verifizierbar
              </span>
              <span className="trust-pill">
                <Mail className="h-3.5 w-3.5 text-primary-strong" />
                CoA per E-Mail
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="container section-pad max-w-3xl">
        <header className="mb-8">
          <span className="mono-label text-muted-foreground">Der Ablauf</span>
          <h2 className="display-title mt-2 text-2xl md:text-3xl">
            Von der Charge zur Freigabe
          </h2>
        </header>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <Card
              key={i}
              variant="lift"
              className="flex gap-5 p-6 reveal-up"
            >
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <step.icon className="h-5 w-5 text-primary-strong" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
              </div>
              <div>
                <h3 className="mb-1 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* CoA note */}
        <div className="mt-12">
          <hr className="rule-gold" />
          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-5 py-4">
              <Mail className="h-5 w-5 shrink-0 text-primary-strong" />
              <p className="text-left text-sm text-muted-foreground">
                Das Analysezertifikat (CoA) wird automatisch per E-Mail mit Ihrer
                Bestellung versendet.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
