import type { Metadata } from "next";
import { getActiveShippingRates } from "@/lib/shipping/rates";
import { formatPrice } from "@/lib/utils";
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

/** Nummerierter Abschnittskopf im Protokoll-Stil. */
function SectionHead({ no, label, title }: { no: string; label: string; title: string }) {
  return (
    <header className="grid gap-x-8 sm:grid-cols-[64px_1fr]">
      <span className="mono-label pt-1.5 text-primary-strong">{no}</span>
      <div>
        <span className="mono-label text-muted-foreground">{label}</span>
        <h2 className="display-title mt-1.5 text-2xl">{title}</h2>
      </div>
    </header>
  );
}

export default async function VersandPage() {
  const rates = await getActiveShippingRates();
  const deRate = rates.find((r) => r.countryCode === "DE");
  const otherRates = rates.filter((r) => r.countryCode !== "DE");

  const dePriceStr = deRate ? formatPrice(deRate.priceInCents) : "5,99 €";

  // Eckdaten als Protokollzeilen statt Icon-Karten.
  const eckdaten: ReadonlyArray<[string, string, string]> = [
    ["Versandkosten", `${dePriceStr} innerhalb Deutschlands`, "EU-weit kostenlos ab 200 EUR Warenwert"],
    ["Lieferzeit", "2 bis 4 Werktage innerhalb Deutschlands", "3 bis 7 Werktage EU-Ausland"],
    ["Verpackung", "Neutrale, diskrete Verpackung", "Stoßfest und versandsicher"],
    ["Versandgebiet", "Deutschland und die gesamte EU", `${rates.length} Lieferländer`],
  ];

  return (
    <div className="container max-w-3xl section-pad">
      <header>
        <span className="eyebrow">Versand &amp; Lieferung</span>
        <h1 className="display-title mt-3 text-4xl md:text-5xl">
          Versand &amp; Lieferung
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Diskret verpackt, kühl versandt, EU-weit nachverfolgbar — alle
          Konditionen zu Kosten, Laufzeiten und Lieferländern.
        </p>
      </header>

      <div className="tick-rule mt-10" aria-hidden="true" />

      {/* Eckdaten-Protokoll */}
      <dl className="mb-14">
        {eckdaten.map(([key, lineA, lineB]) => (
          <div
            key={key}
            className="grid gap-x-10 gap-y-1.5 border-b border-border py-5 sm:grid-cols-[180px_1fr]"
          >
            <dt className="field-label !mb-0 pt-0.5">{key}</dt>
            <dd className="text-sm leading-relaxed">
              {lineA}
              <br />
              <span className="text-muted-foreground">{lineB}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="space-y-12 text-sm leading-relaxed">
        <section>
          <SectionHead no="01" label="Laufzeit" title="Lieferzeit" />
          <p className="mt-3 sm:pl-[96px]">
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
          <SectionHead no="02" label="Tarife" title="Versandkosten pro Land" />
          <div className="mt-3 sm:pl-[96px]">
            <p>
              Wir versenden in alle 27 EU-Mitgliedsstaaten. Ab einem Bestellwert
              von <strong className="text-foreground">200 EUR</strong> ist der
              Versand EU-weit{" "}
              <strong className="text-foreground">kostenlos</strong>. Andernfalls
              gelten folgende Pauschalen (brutto, inkl. MwSt.):
            </p>
            <div className="mt-4 overflow-x-auto border border-border">
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
                    <tr className="bg-accent/60">
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
          </div>
        </section>

        <section>
          <SectionHead no="03" label="Carrier" title="Versanddienstleister" />
          <p className="mt-3 sm:pl-[96px]">
            Wir versenden über DHL. Sobald Ihre Bestellung verschickt wurde,
            erhalten Sie eine Versandbestätigung mit Sendungsnummer, über die
            Sie den Status Ihrer Lieferung jederzeit verfolgen können.
          </p>
        </section>

        <section>
          <SectionHead no="04" label="Handling" title="Lagerung" />
          <p className="mt-3 sm:pl-[96px]">
            Bitte prüfen Sie den Zustand der Sendung unmittelbar nach Erhalt
            und lagern Sie die Produkte gemäß den Angaben auf dem jeweiligen
            Produktblatt (typischerweise bei minus 20 °C).
          </p>
        </section>

        <section>
          <SectionHead no="05" label="Außerhalb EU" title="Lieferung außerhalb der EU" />
          <p className="mt-3 sm:pl-[96px]">
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
