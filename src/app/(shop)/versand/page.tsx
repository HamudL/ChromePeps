import type { Metadata } from "next";
import { Truck, Clock, Package, Globe } from "lucide-react";
import { getActiveShippingRates } from "@/lib/shipping/rates";
import { formatPrice } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { BANK_TRANSFER_ENABLED } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Versand & Lieferung",
  description:
    "Informationen zu Lieferzeiten, Versandkosten und Lieferländern bei ChromePeps.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/versand" },
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
    <div className="container max-w-3xl section-pad">
      <header>
        <span className="eyebrow">[ VERSAND &amp; LIEFERUNG ]</span>
        <h1 className="display-title mt-3 text-4xl md:text-5xl">
          Versand &amp; Lieferung
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Diskret verpackt, kühl versandt, EU-weit nachverfolgbar — alle
          Konditionen zu Kosten, Laufzeiten und Lieferländern.
        </p>
      </header>

      <hr className="rule-gold my-10" />

      <div className="space-y-6 text-sm leading-relaxed">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex items-start gap-3 p-4">
            <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" />
            <div>
              <h2 className="font-semibold">Versandkosten</h2>
              <p className="text-muted-foreground">
                {dePriceStr} innerhalb Deutschlands
              </p>
              <p className="text-muted-foreground">
                EU-weit kostenlos ab 200 EUR Warenwert
              </p>
            </div>
          </Card>
          <Card className="flex items-start gap-3 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" />
            <div>
              <h2 className="font-semibold">Lieferzeit</h2>
              <p className="text-muted-foreground">
                2 bis 4 Werktage innerhalb Deutschlands
              </p>
              <p className="text-muted-foreground">
                3 bis 7 Werktage EU-Ausland
              </p>
            </div>
          </Card>
          <Card className="flex items-start gap-3 p-4">
            <Package className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" />
            <div>
              <h2 className="font-semibold">Verpackung</h2>
              <p className="text-muted-foreground">
                Neutrale, diskrete Verpackung
              </p>
              <p className="text-muted-foreground">
                Stoßfest und versandsicher
              </p>
            </div>
          </Card>
          <Card className="flex items-start gap-3 p-4">
            <Globe className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" />
            <div>
              <h2 className="font-semibold">Versandgebiet</h2>
              <p className="text-muted-foreground">
                Deutschland und die gesamte EU
              </p>
              <p className="text-muted-foreground">
                {rates.length} Lieferländer
              </p>
            </div>
          </Card>
        </div>

        <section>
          <span className="mono-label text-muted-foreground">Laufzeit</span>
          <h2 className="display-title mt-2 text-xl">Lieferzeit</h2>
          <p className="mt-2">
            Die Lieferzeit beträgt, sofern beim jeweiligen Produkt nicht anders
            angegeben, innerhalb Deutschlands 2 bis 4 Werktage nach Zahlungseingang;
            für EU-Lieferungen rechnen Sie bitte mit 3 bis 7 Werktagen.
            {BANK_TRANSFER_ENABLED && (
              <>
                {" "}
                Bei Zahlung per Vorkasse beginnt die Lieferzeit einen Tag nach
                Erteilung des Zahlungsauftrages an das überweisende
                Kreditinstitut.
              </>
            )}{" "}
            Bei Zahlung per Kreditkarte oder Stripe-Zahlungsdienst erfolgt der
            Versand unmittelbar nach erfolgreicher Zahlungsfreigabe.
          </p>
        </section>

        <section>
          <span className="mono-label text-muted-foreground">Tarife</span>
          <h2 className="display-title mt-2 text-xl">Versandkosten pro Land</h2>
          <p className="mt-2">
            Wir versenden in alle 27 EU-Mitgliedsstaaten. Ab einem Bestellwert
            von <strong className="text-foreground">200 EUR</strong> ist der
            Versand EU-weit{" "}
            <strong className="text-foreground">kostenlos</strong>. Andernfalls
            gelten folgende Pauschalen (brutto, inkl. MwSt.):
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground">
                  <th className="mono-label px-4 py-2.5 text-left text-muted-foreground">
                    Land
                  </th>
                  <th className="mono-label px-4 py-2.5 text-left text-muted-foreground">
                    Code
                  </th>
                  <th className="mono-label px-4 py-2.5 text-right text-muted-foreground">
                    Versandkosten
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deRate && (
                  <tr className="bg-primary/5">
                    <td className="px-4 py-2.5 font-medium">
                      {deRate.countryName}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {deRate.countryCode}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {formatPrice(deRate.priceInCents)}
                    </td>
                  </tr>
                )}
                {otherRates.map((r) => (
                  <tr key={r.countryCode}>
                    <td className="px-4 py-2.5">{r.countryName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {r.countryCode}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
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
          <span className="mono-label text-muted-foreground">Carrier</span>
          <h2 className="display-title mt-2 text-xl">Versanddienstleister</h2>
          <p className="mt-2">
            Wir versenden über DHL. Sobald Ihre Bestellung verschickt wurde,
            erhalten Sie eine Versandbestätigung mit Sendungsnummer, über die
            Sie den Status Ihrer Lieferung jederzeit verfolgen können.
          </p>
        </section>

        <section>
          <span className="mono-label text-muted-foreground">Handling</span>
          <h2 className="display-title mt-2 text-xl">Lagerung</h2>
          <p className="mt-2">
            Bitte prüfen Sie den Zustand der Sendung unmittelbar nach Erhalt
            und lagern Sie die Produkte gemäß den Angaben auf dem jeweiligen
            Produktblatt (typischerweise bei minus 20 °C).
          </p>
        </section>

        <section>
          <span className="mono-label text-muted-foreground">Außerhalb EU</span>
          <h2 className="display-title mt-2 text-xl">
            Lieferung außerhalb der EU
          </h2>
          <p className="mt-2">
            Lieferungen in Nicht-EU-Länder (z.B. Schweiz, Vereinigtes
            Königreich) sind aktuell nicht über den Online-Shop verfügbar.
            Bitte wenden Sie sich für eine individuelle Anfrage direkt an{" "}
            <a
              href="mailto:support@chromepeps.com"
              className="text-primary-strong underline-offset-2 hover:underline"
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
