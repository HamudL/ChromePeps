import type { Metadata } from "next";
import { FlaskConical, Shield, Truck, Award } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Über uns",
  description: `${APP_NAME} — Ihr Partner für hochreine Forschungspeptide. Erfahren Sie mehr über unsere Mission, Qualitätsstandards und unser Team.`,
  robots: { index: true, follow: true },
};

const values = [
  {
    icon: FlaskConical,
    title: "Reinheit & Qualität",
    description:
      "Jedes Peptid wird mittels HPLC und Massenspektrometrie analysiert. Wir liefern Analysezertifikate (CoA) zu jedem Produkt — Transparenz ist für uns nicht verhandelbar.",
  },
  {
    icon: Shield,
    title: "Compliance & Datenschutz",
    description:
      "Als deutsches Unternehmen halten wir streng die DSGVO ein. Unsere Website verzichtet auf invasives Tracking — Ihre Daten gehören Ihnen.",
  },
  {
    icon: Truck,
    title: "Schneller Versand",
    description:
      "Bestellungen werden innerhalb von 24 Stunden bearbeitet und in stabiler, neutraler Verpackung versendet. So kommt Ihre Ware sicher und unversehrt im Labor an.",
  },
  {
    icon: Award,
    title: "Forschung im Fokus",
    description:
      "Wir arbeiten mit Forschungseinrichtungen und Laboren zusammen, um ein Sortiment zu bieten, das den aktuellen Stand der Peptidforschung widerspiegelt.",
  },
];

export default function UeberUnsPage() {
  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Über {APP_NAME}
      </h1>
      <p className="text-lg text-muted-foreground mb-10 max-w-2xl">
        Wir sind ein spezialisierter Anbieter von Forschungspeptiden mit dem
        Anspruch, Wissenschaftlern und Laboren hochreine Substanzen zu fairen
        Preisen bereitzustellen.
      </p>

      {/* Mission */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">Unsere Mission</h2>
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <p>
            Peptide sind die Grundbausteine moderner biomedizinischer Forschung.
            Ob Metabolismus, Zellsignalisierung oder Geweberegeneration — die
            Qualität der eingesetzten Substanzen entscheidet über die
            Aussagekraft jeder Studie.
          </p>
          <p>
            Bei {APP_NAME} verbinden wir präzise Analytik mit einem
            unkomplizierten Bestellprozess. Unser Ziel: Forschende sollen sich
            auf ihre Arbeit konzentrieren können — nicht auf die
            Lieferantenbewertung.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6">Unsere Werte</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {values.map((value) => (
            <div key={value.title} className="border rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <value.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{value.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t pt-8 text-center">
        <h2 className="text-xl font-bold mb-3">Haben Sie Fragen?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Wir helfen Ihnen gerne weiter — ob zu Produkten, Bestellungen oder
          Kooperationen.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/kontakt"
            className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Kontakt aufnehmen
          </a>
          <a
            href="/faq"
            className="inline-flex items-center rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            FAQ ansehen
          </a>
        </div>
      </section>
    </div>
  );
}
