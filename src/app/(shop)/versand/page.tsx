import type { Metadata } from "next";
import { Truck, Clock, Package, Globe } from "lucide-react";
import { getActiveShippingRates } from "@/lib/shipping/rates";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Versand & Lieferung",
  description:
    "Informationen zu Lieferzeiten, Versandkosten und Lieferländern bei ChromePeps.",
  robots: { index: true, follow: true },
};

// Server-Component — die Tabelle wird beim Build / pro Request aus der
// shipping_rates-Tabelle gefüttert. Ein Admin-Edit ist somit sofort
// auf der öffentlichen Versand-Seite sichtbar (force-dynamic, weil die
// Rates selten genug ändern dass eine kurze Cache-TTL ok wäre, aber
// häufig genug dass volle Statisierung Drift erzeugt).
export const dynamic = "force-dynamic";

export default async function VersandPage() {
  const rates = await getActiveShippingRates();
  const deRate = rates.find((r) => r.countryCode === "DE");
  const otherRates = rates.filter((r) => r.countryCode !== "DE");

  const dePriceStr = deRate ? formatPrice(deRate.priceInCents) : "5,99 €";

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
                {dePriceStr} innerhalb Deutschlands
              </p>
              <p className="text-muted-foreground">
                EU-weit kostenlos ab 200 EUR Warenwert
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
                3–7 Werktage EU-Ausland
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
                Deutschland und die gesamte EU
              </p>
              <p className="text-muted-foreground">
                {rates.length} Lieferländer
              </p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold">Lieferzeit</h2>
          <p>
            Die Lieferzeit beträgt, sofern beim jeweiligen Produkt nicht anders
            angegeben, innerhalb Deutschlands 2–4 Werktage nach Zahlungseingang;
            für EU-Lieferungen rechnen Sie bitte mit 3–7 Werktagen. Bei Zahlung
            per Vorkasse beginnt die Lieferzeit einen Tag nach Erteilung des
            Zahlungsauftrages an das überweisende Kreditinstitut. Bei Zahlung
            per Kreditkarte oder Stripe-Zahlungsdienst erfolgt der Versand
            unmittelbar nach erfolgreicher Zahlungsfreigabe.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Versandkosten pro Land</h2>
          <p>
            Wir versenden in alle 27 EU-Mitgliedsstaaten. Ab einem Bestellwert
            von <strong>200 EUR</strong> ist der Versand EU-weit{" "}
            <strong>kostenlos</strong>. Andernfalls gelten folgende Pauschalen
            (brutto, inkl. MwSt.):
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Land</th>
                  <th className="px-4 py-2 text-left font-medium">Code</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Versandkosten
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deRate && (
                  <tr className="bg-primary/5">
                    <td className="px-4 py-2 font-medium">
                      {deRate.countryName}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {deRate.countryCode}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatPrice(deRate.priceInCents)}
                    </td>
                  </tr>
                )}
                {otherRates.map((r) => (
                  <tr key={r.countryCode}>
                    <td className="px-4 py-2">{r.countryName}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {r.countryCode}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatPrice(r.priceInCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Die endgültigen Versandkosten werden im Checkout anhand der
            Lieferadresse berechnet und vor der Zahlung transparent
            ausgewiesen.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Versanddienstleister</h2>
          <p>
            Wir versenden über DHL. Sobald Ihre Bestellung verschickt wurde,
            erhalten Sie eine Versandbestätigung mit Sendungsnummer, über die
            Sie den Status Ihrer Lieferung jederzeit verfolgen können.
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
          <h2 className="text-lg font-semibold">Lieferung außerhalb der EU</h2>
          <p>
            Lieferungen in Nicht-EU-Länder (z.B. Schweiz, Vereinigtes
            Königreich) sind aktuell nicht über den Online-Shop verfügbar.
            Bitte wenden Sie sich für eine individuelle Anfrage direkt an{" "}
            <a
              href="mailto:support@chromepeps.com"
              className="text-primary underline-offset-2 hover:underline"
            >
              support@chromepeps.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
