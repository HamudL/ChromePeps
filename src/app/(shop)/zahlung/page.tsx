import type { Metadata } from "next";
import { CreditCard, Landmark, Shield, CheckCircle2 } from "lucide-react";
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

export default function ZahlungPage() {
  return (
    <div className="container max-w-3xl section-pad">
      <header>
        <span className="eyebrow">[ ZAHLUNG ]</span>
        <h1 className="display-title mt-3 text-4xl md:text-5xl">
          Zahlungsmethoden
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Sichere, bewährte Zahlungswege — verschlüsselt übertragen und über
          einen PCI-DSS-zertifizierten Dienstleister abgewickelt.
        </p>
      </header>

      <hr className="rule-gold my-10" />

      <div className="space-y-6 text-sm leading-relaxed">
        <div className={`grid gap-4 ${BANK_TRANSFER_ENABLED ? "sm:grid-cols-2" : ""}`}>
          {BANK_TRANSFER_ENABLED && (
            <Card className="p-5">
              <Landmark className="h-5 w-5 text-primary-strong" />
              <h2 className="mt-3 font-semibold">Vorkasse / Überweisung</h2>
              <p className="mt-1.5 text-muted-foreground">
                Überweisen Sie den Rechnungsbetrag auf unser Bankkonto. Versand
                erfolgt nach Zahlungseingang.
              </p>
            </Card>
          )}
          <Card className="p-5">
            <CreditCard className="h-5 w-5 text-primary-strong" />
            <h2 className="mt-3 font-semibold">Kreditkarte (Stripe)</h2>
            <p className="mt-1.5 text-muted-foreground">
              Visa, Mastercard und American Express. Sofortiger Versand nach
              Zahlungsfreigabe.
            </p>
          </Card>
        </div>

        {BANK_TRANSFER_ENABLED && (
          <section>
            <span className="mono-label text-muted-foreground">
              01 · Vorkasse
            </span>
            <h2 className="display-title mt-2 text-xl">
              Vorkasse per Banküberweisung
            </h2>
            <p className="mt-2">
              Bei Wahl der Zahlungsart Vorkasse senden wir Ihnen unmittelbar nach
              Bestellabschluss eine Auftragsbestätigung mit unseren Bankdaten. Die
              Ware wird versendet, sobald der Rechnungsbetrag vollständig auf
              unserem Konto eingegangen ist. Bitte geben Sie bei der Überweisung
              Ihre Bestellnummer als Verwendungszweck an, damit wir die Zahlung
              schnell zuordnen können.
            </p>
            <Card variant="ink" className="card-ink mt-4 p-5">
              <span className="eyebrow">[ UNSERE BANKVERBINDUNG ]</span>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 font-mono text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-ink-muted">Kontoinhaber</dt>
                <dd className="text-ink-foreground">{BANK_DETAILS.accountHolder}</dd>
                <dt className="text-ink-muted">IBAN</dt>
                <dd className="text-ink-foreground">{BANK_DETAILS.iban}</dd>
                <dt className="text-ink-muted">BIC</dt>
                <dd className="text-ink-foreground">{BANK_DETAILS.bic}</dd>
                <dt className="text-ink-muted">Bank</dt>
                <dd className="text-ink-foreground">{BANK_DETAILS.bankName}</dd>
              </dl>
            </Card>
          </section>
        )}

        <section>
          <span className="mono-label text-muted-foreground">
            {BANK_TRANSFER_ENABLED ? "02" : "01"} · Karte
          </span>
          <h2 className="display-title mt-2 text-xl">Kreditkarte über Stripe</h2>
          <p className="mt-2">
            Wir akzeptieren Visa, Mastercard und American Express. Die Zahlung
            wird über den PCI-DSS-zertifizierten Zahlungsdienstleister Stripe
            abgewickelt. Ihre Zahlungsdaten werden verschlüsselt direkt an
            Stripe übermittelt; wir selbst erhalten und speichern keine
            Kreditkartendaten. Nach erfolgreicher Freigabe wird die Bestellung
            bearbeitet und versandt.
          </p>
        </section>

        <section>
          <span className="mono-label text-muted-foreground">Sicherheit</span>
          <h2 className="display-title mt-2 text-xl">Wie wir Ihre Zahlung schützen</h2>
          <ul className="mt-3 list-none space-y-2.5">
            <li className="flex items-start gap-2.5">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                Alle Datenübertragungen sind SSL/TLS-verschlüsselt (HTTPS).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                Zahlungsabwicklung über PCI-DSS-zertifizierten Anbieter
                (Stripe).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                Keine Speicherung von Kreditkartendaten auf unseren Servern.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                Transparente Preisangaben inklusive aller gesetzlichen
                Abgaben.
              </span>
            </li>
          </ul>
        </section>

        <section>
          <span className="mono-label text-muted-foreground">Steuer</span>
          <h2 className="display-title mt-2 text-xl">Mehrwertsteuer</h2>
          <p className="mt-2">
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
