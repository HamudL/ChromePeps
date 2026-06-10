import Link from "next/link";
import {
  ShieldCheck,
  Microscope,
  Package,
  Eye,
  Mail,
  ArrowRight,
  FlaskConical,
} from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
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
        <div className="container relative py-14 md:py-20">
          <div className="max-w-3xl space-y-5">
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 px-3 py-1 text-xs"
            >
              <FlaskConical className="mr-1.5 h-3 w-3 text-primary" />
              Qualitätskontrolle
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Jede Charge. Unabhängig geprüft.
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Wir senden jede neue Charge an Janoshik Labs. Erst nach
              HPLC-Freigabe geht sie in den Versand, ohne Ausnahme.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* Früher gab es hier einen zweiten CTA zur öffentlichen
                  CoA-Sammlung. Die Sammlung ist nicht mehr öffentlich —
                  CoAs werden automatisch mit jeder Bestellung per E-Mail
                  versandt. Daher nur noch der Shop-CTA. */}
              <Button asChild size="lg" className="gap-2 h-11">
                <Link href="/products">
                  Produkte entdecken
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Janoshik HPLC</span>
              </div>
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span>Öffentlich verifizierbar</span>
              </div>
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span>CoA per E-Mail</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="container py-14 md:py-18 max-w-3xl">
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-5 rounded-xl border p-6 hover:shadow-md transition-shadow">
              <div className="relative flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 shrink-0">
                <step.icon className="h-5 w-5 text-primary" />
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">{step.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CoA note */}
        <div className="text-center mt-12 pt-8 border-t">
          <div className="mx-auto inline-flex items-center gap-3 rounded-xl border bg-muted/40 px-5 py-4">
            <Mail className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground text-left">
              Das Analysezertifikat (CoA) wird automatisch per E-Mail mit Ihrer
              Bestellung versendet.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
