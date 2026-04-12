import Link from "next/link";
import {
  ShieldCheck,
  FlaskConical,
  Microscope,
  Package,
  Eye,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qualitätskontrolle | ChromePeps",
  description:
    "Unser mehrstufiger Qualitätskontrollprozess garantiert die Reinheit und Sicherheit aller ChromePeps-Forschungspeptide. HPLC-getestet durch unabhängige Drittlabore.",
};

const steps = [
  {
    icon: Package,
    title: "Chargen-Handling",
    description:
      "Jede neue Charge wird sofort in einem dedizierten, desinfizierten Laborgefrierschrank bei -24°C gelagert und erhält eine eindeutige Lot-Nummer. Dieses lot-basierte System ermöglicht die lückenlose Rückverfolgung jedes Produkts bis zu seiner Quelle, den Testdaten und dem Verpackungsdatum.",
  },
  {
    icon: Microscope,
    title: "Analytische Prüfung",
    description:
      "Jede Charge wird an ein unabhängiges Drittlabor zur umfassenden Analyse gesendet. Die Hochleistungsflüssigkeitschromatographie (HPLC) bildet das Rückgrat unserer Reinheitsprüfung. Bei Bedarf setzen wir zusätzlich quantitative Kernspinresonanzspektroskopie (qNMR) und Flüssigchromatographie-Massenspektrometrie (LC-MS) ein.",
  },
  {
    icon: ShieldCheck,
    title: "Sicherheitstests",
    description:
      "Neben Reinheit und Peptidgehalt testen wir auf bakterielle Endotoxine — toxische Verbindungen, die Peptidprodukte während der Herstellung oder Handhabung kontaminieren können. Selbst Spurenmengen von Endotoxinen können die Integrität von Forschungsergebnissen beeinträchtigen.",
  },
  {
    icon: Eye,
    title: "Transparenz & Verifizierung",
    description:
      "Nur Chargen, die alle Tests bestehen und unsere strengen qualitativen Standards erfüllen, werden zur Verpackung freigegeben. Jedes Testergebnis wird veröffentlicht und mit einer eindeutigen Referenznummer verknüpft, die Sie direkt auf der Website unseres Analyselabors verifizieren können.",
  },
];

export default function QualitaetskontrollePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden chrome-gradient">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(217,55%,45%,0.08),transparent_70%)]" />
        <div className="container relative py-12 md:py-16 text-center">
          <FlaskConical className="mx-auto h-10 w-10 text-primary mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Qualitätskontrolle
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Jedes Peptid in unserem Sortiment durchläuft einen strengen,
            mehrstufigen Qualitätskontrollprozess — ohne Ausnahme.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container py-12 md:py-16 max-w-4xl">
        {/* Intro */}
        <div className="prose prose-neutral dark:prose-invert max-w-none mb-12">
          <p className="text-lg text-muted-foreground leading-relaxed">
            Bei ChromePeps steht die Qualität unserer Forschungspeptide an
            erster Stelle. Wir arbeiten mit dem renommierten unabhängigen
            Analyselabor <strong>Janoshik</strong> zusammen, um sicherzustellen,
            dass jede einzelne Charge unseren hohen Qualitätsstandards
            entspricht.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6 mb-12">
          {steps.map((step, i) => (
            <Card key={i}>
              <CardContent className="p-6 flex gap-5">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 shrink-0">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-lg font-semibold">{step.title}</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Testing Methods */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Unsere Testmethoden</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <p className="font-semibold mb-1">HPLC</p>
                <p className="text-xs text-muted-foreground">
                  Hochleistungsflüssigkeits&shy;chromatographie — Industriestandard zur Reinheitsanalyse
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="font-semibold mb-1">qNMR</p>
                <p className="text-xs text-muted-foreground">
                  Quantitative Kernspinresonanz&shy;spektroskopie — Bestätigung der molekularen Identität
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="font-semibold mb-1">LC-MS</p>
                <p className="text-xs text-muted-foreground">
                  Flüssigchromatographie-Massen&shy;spektrometrie — Verifizierung der Zusammensetzung
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center border-t pt-8">
          <p className="text-muted-foreground mb-4">
            Alle Testergebnisse sind öffentlich einsehbar und können unabhängig
            verifiziert werden.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/analysezertifikate">
              Analysezertifikate ansehen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
