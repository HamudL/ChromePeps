import type { Metadata } from "next";
import { Truck, Clock, Package, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Versand & Lieferung",
  description:
    "Informationen zu Lieferzeiten, Versandkosten und Lieferländern bei ChromePeps.",
  robots: { index: true, follow: true },
};

export default function VersandPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Versand &amp; Lieferung
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Alle Informationen zu Versandkosten, Lieferzeiten und Versandländern.
      </p>

      <div className="space-y-6 text-sm leading-relaxed">
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="border rounded-lg p-4 flex items-start gap-3">
            <Truck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold">Versandkosten</h3>
              <p className="text-muted-foreground">
                5,99 EUR innerhalb Deutschlands
              </p>
              <p className="text-muted-foreground">
                Ab 200 EUR Warenwert kostenlos
              </p>
            </div>
          </div>
          <div className="border rounded-lg p-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold">Lieferzeit</h3>
              <p className="text-muted-foreground">
                2–4 Werktage innerhalb Deutschlands
              </p>
              <p className="text-muted-foreground">
                nach Zahlungseingang
              </p>
            </div>
          </div>
          <div className="border rounded-lg p-4 flex items-start gap-3">
            <Package className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold">Verpackung</h3>
              <p className="text-muted-foreground">
                Neutrale, diskrete Verpackung
              </p>
              <p className="text-muted-foreground">
                Stoßfest und versandsicher
              </p>
            </div>
          </div>
          <div className="border rounded-lg p-4 flex items-start gap-3">
            <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold">Versandgebiet</h3>
              <p className="text-muted-foreground">
                Derzeit nur Deutschland
              </p>
              <p className="text-muted-foreground">
                EU-Versand auf Anfrage
              </p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold">Lieferzeit</h2>
          <p>
            Die Lieferzeit beträgt, sofern beim jeweiligen Produkt nicht anders
            angegeben, innerhalb Deutschlands 2–4 Werktage nach Zahlungseingang.
            Bei Zahlung per Vorkasse beginnt die Lieferzeit einen Tag nach
            Erteilung des Zahlungsauftrages an das überweisende Kreditinstitut.
            Bei Zahlung per Kreditkarte oder Stripe-Zahlungsdienst erfolgt der
            Versand unmittelbar nach erfolgreicher Zahlungsfreigabe.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Versandkosten</h2>
          <p>
            Innerhalb Deutschlands berechnen wir eine Versandkostenpauschale von{" "}
            <strong>5,99 EUR</strong>. Ab einem Bestellwert von{" "}
            <strong>200 EUR</strong> ist der Versand kostenlos. Die Versandkosten
            werden im Warenkorb und im Checkout transparent ausgewiesen.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Versanddienstleister</h2>
          <p>
            Wir versenden über [TODO: DHL / DPD / UPS — bitte ergänzen]. Sobald
            Ihre Bestellung verschickt wurde, erhalten Sie eine
            Versandbestätigung mit Sendungsnummer, über die Sie den Status
            Ihrer Lieferung jederzeit verfolgen können.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Lagerung</h2>
          <p>
            Bitte prüfen Sie den Zustand der Sendung unmittelbar nach Erhalt
            und lagern Sie die Produkte gemäß den Angaben auf dem jeweiligen
            Produktblatt (typischerweise bei –20 °C).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Auslandsversand</h2>
          <p>
            Derzeit liefern wir ausschließlich innerhalb Deutschlands.
            Anfragen zu Lieferungen in andere EU-Länder richten Sie bitte an
            [TODO: kontakt@chromepeps.com].
          </p>
        </section>
      </div>
    </div>
  );
}
