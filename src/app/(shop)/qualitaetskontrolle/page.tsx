import {
  ShieldCheck,
  Microscope,
  Package,
  Eye,
  Mail,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qualitätskontrolle | ChromePeps",
  description:
    "Unser Qualitätskontrollprozess: Jede Charge wird durch das unabhängige Analyselabor Janoshik auf Reinheit getestet.",
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
      {/* Hero (dark) */}
      <section className="section-dark">
        <div className="container py-16 md:py-20 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Qualitätskontrolle
          </h1>
          <p className="text-white/60 max-w-xl mx-auto text-lg">
            Jede Charge wird durch das unabhängige Analyselabor Janoshik getestet — ohne Ausnahme.
          </p>
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
