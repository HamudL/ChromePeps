import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BANK_DETAILS, BANK_TRANSFER_ENABLED } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Zahlungsmethoden",
  description: BANK_TRANSFER_ENABLED
    ? "Informationen zu Zahlungsmöglichkeiten bei ChromePeps: Vorkasse und Kreditkarte via Stripe."
    : "Informationen zu Zahlungsmöglichkeiten bei ChromePeps: Kreditkarte via Stripe.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/zahlung" },
};

// force-dynamic: Diese Seite liest Runtime-Env (SELLER_*/BANK_*-Stamm-
// daten). Statisches Prerender wuerde die LEERE CI-Build-Env backen und
// der fluechtige ISR-Cache (.next/cache liegt auf keinem Volume) wuerde
// die Platzhalter-Version nach JEDEM Deploy/Restart erneut servieren -
// auf Pflichtseiten inakzeptabel. Ohne DB-Zugriff ist per-Request-
// Rendering hier ohnehin praktisch kostenlos.
export const dynamic = "force-dynamic";

/** Nummerierter Abschnittskopf im Protokoll-Stil (identisch zu /versand). */
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

export default function ZahlungPage() {
  // Abschnittsnummern verschieben sich, wenn Vorkasse deaktiviert ist.
  const no = (i: number) => String(BANK_TRANSFER_ENABLED ? i : i - 1).padStart(2, "0");

  // Eckdaten als Protokollzeilen — konsistent zur Versand-Seite.
  const eckdaten: ReadonlyArray<readonly [string, string, string]> = [
    ...(BANK_TRANSFER_ENABLED
      ? ([
          [
            "Vorkasse",
            "Banküberweisung auf unser Konto",
            "Versand nach Zahlungseingang",
          ],
        ] as const)
      : []),
    [
      "Kreditkarte",
      "Visa, Mastercard, American Express (Stripe)",
      "Sofortiger Versand nach Zahlungsfreigabe",
    ],
    [
      "Sicherheit",
      "SSL/TLS-verschlüsselte Übertragung",
      "PCI-DSS-zertifizierter Zahlungsdienstleister",
    ],
    [
      "Steuern",
      "Alle Preise inkl. 19 % MwSt.",
      "Rechnung automatisch per E-Mail",
    ],
  ];

  return (
    <div className="container max-w-3xl section-pad">
      <header>
        <span className="eyebrow">Zahlung</span>
        <h1 className="display-title mt-3 text-4xl md:text-5xl">
          Zahlungsmethoden
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Sichere, bewährte Zahlungswege — verschlüsselt übertragen und über
          einen PCI-DSS-zertifizierten Dienstleister abgewickelt.
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
        {BANK_TRANSFER_ENABLED && (
          <section>
            <SectionHead no="01" label="Vorkasse" title="Vorkasse per Banküberweisung" />
            <div className="mt-3 sm:pl-[96px]">
              <p>
                Bei Wahl der Zahlungsart Vorkasse senden wir Ihnen unmittelbar nach
                Bestellabschluss eine Auftragsbestätigung mit unseren Bankdaten. Die
                Ware wird versendet, sobald der Rechnungsbetrag vollständig auf
                unserem Konto eingegangen ist. Bitte geben Sie bei der Überweisung
                Ihre Bestellnummer als Verwendungszweck an, damit wir die Zahlung
                schnell zuordnen können.
              </p>
              <Card variant="ink" className="mt-5 p-5">
                <span className="eyebrow">Unsere Bankverbindung</span>
                <div className="tick-rule mt-4" aria-hidden="true" />
                <dl className="mt-1 font-mono text-[13px]">
                  {(
                    [
                      ["Kontoinhaber", BANK_DETAILS.accountHolder],
                      ["IBAN", BANK_DETAILS.iban],
                      ["BIC", BANK_DETAILS.bic],
                      ["Bank", BANK_DETAILS.bankName],
                    ] as const
                  ).map(([k, v]) => (
                    <div
                      key={k}
                      className="grid gap-x-6 gap-y-0.5 border-b border-ink-border py-2.5 last:border-b-0 sm:grid-cols-[140px_1fr]"
                    >
                      <dt className="mono-label !text-[10.5px] text-ink-muted">{k}</dt>
                      <dd className="break-all text-ink-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </div>
          </section>
        )}

        <section>
          <SectionHead no={no(2)} label="Karte" title="Kreditkarte über Stripe" />
          <p className="mt-3 sm:pl-[96px]">
            Wir akzeptieren Visa, Mastercard und American Express. Die Zahlung
            wird über den PCI-DSS-zertifizierten Zahlungsdienstleister Stripe
            abgewickelt. Ihre Zahlungsdaten werden verschlüsselt direkt an
            Stripe übermittelt; wir selbst erhalten und speichern keine
            Kreditkartendaten. Nach erfolgreicher Freigabe wird die Bestellung
            bearbeitet und versandt.
          </p>
        </section>

        <section>
          <SectionHead no={no(3)} label="Sicherheit" title="Wie wir Ihre Zahlung schützen" />
          <ul className="mt-3 list-none space-y-0 sm:pl-[96px]">
            {[
              "Alle Datenübertragungen sind SSL/TLS-verschlüsselt (HTTPS).",
              "Zahlungsabwicklung über PCI-DSS-zertifizierten Anbieter (Stripe).",
              "Keine Speicherung von Kreditkartendaten auf unseren Servern.",
              "Transparente Preisangaben inklusive aller gesetzlichen Abgaben.",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 border-b border-border py-3 last:border-b-0"
              >
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-success"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHead no={no(4)} label="Steuer" title="Mehrwertsteuer" />
          <p className="mt-3 sm:pl-[96px]">
            Alle Preise verstehen sich inklusive der gesetzlichen
            Mehrwertsteuer von 19 %. Eine ordnungsgemäße Rechnung mit
            ausgewiesener MwSt. erhalten Sie automatisch per E-Mail und steht
            zudem in Ihrem Kundenkonto zum Download bereit.
          </p>
        </section>
      </div>
    </div>
  );
}
