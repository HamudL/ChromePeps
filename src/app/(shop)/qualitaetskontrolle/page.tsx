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
import { Badge } from "@/components/ui/badge";
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
      "Jede neue Charge wird sofort in einem dedizierten, desinfizierten Laborgefrierschrank bei -24\u00B0C gelagert und erhält eine eindeutige Lot-Nummer. Dieses lot-basierte System ermöglicht die lückenlose Rückverfolgung jedes Produkts bis zu seiner Quelle, den Testdaten und dem Verpackungsdatum.",
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
      <section className="relative overflow-hidden hero-glow bg-gradient-to-b from-background via-muted/40 to-background">
        <div className="absolute inset-0 subtle-grid opacity-30" />
        <div className="container relative py-14 md:py-20 text-center">
          <Badge variant="outline" className="px-3 py-1 text-xs mb-4 border-primary/30 bg-primary/5">
            <ShieldCheck className="mr-1 h-3 w-3 text-primary" />
            Qualitätssicherung
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Qualitätskontrolle
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Jedes Peptid in unserem Sortiment durchläuft einen strengen,
            mehrstufigen Qualitätskontrollprozess — ohne Ausnahme.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container py-14 md:py-18 max-w-4xl">
        {/* Intro */}
        <div className="mb-14">
          <p className="text-lg text-muted-foreground leading-relaxed">
            Bei ChromePeps steht die Qualität unserer Forschungspeptide an
            erster Stelle. Wir arbeiten mit dem renommierten unabhängigen
            Analyselabor <strong className="text-foreground">Janoshik</strong> zusammen, um sicherzustellen,
            dass jede einzelne Charge unseren hohen Qualitätsstandards
            entspricht.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-5 mb-14">
          {steps.map((step, i) => (
            <Card key={i} className="group border-border/50 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <CardContent className="p-6 flex gap-5">
                <div className="relative flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shrink-0 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                  <step.icon className="h-5 w-5 text-primary" />
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-1.5">{step.title}</h2>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {step.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Testing Methods */}
        <div className="mb-14">
          <h2 className="text-xl font-semibold mb-5">Unsere Testmethoden</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                name: "HPLC",
                full: "Hochleistungsflüssigkeits\u00ADchromatographie",
                desc: "Industriestandard zur Reinheitsanalyse",
              },
              {
                name: "qNMR",
                full: "Quantitative Kernspinresonanz\u00ADspektroskopie",
                desc: "Bestätigung der molekularen Identität",
              },
              {
                name: "LC-MS",
                full: "Flüssigchromatographie-Massen\u00ADspektrometrie",
                desc: "Verifizierung der Zusammensetzung",
              },
            ].map((method) => (
              <Card key={method.name} className="group border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                <CardContent className="p-5 text-center">
                  <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 mb-3">
                    <FlaskConical className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-semibold text-base mb-1">{method.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {method.full} — {method.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center rounded-2xl bg-gradient-to-br from-muted/50 via-muted/30 to-background border border-border/50 p-8 md:p-10">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary/60 mb-3" />
          <p className="text-muted-foreground mb-5 max-w-md mx-auto leading-relaxed">
            Alle Testergebnisse sind öffentlich einsehbar und können unabhängig
            verifiziert werden.
          </p>
          <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/20">
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
