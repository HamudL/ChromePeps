import type { Metadata } from "next";
import { CreditCard, Landmark, Shield, CheckCircle2 } from "lucide-react";
import { BANK_DETAILS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Zahlungsmethoden",
  description:
    "Informationen zu Zahlungsmöglichkeiten bei ChromePeps: Vorkasse und Kreditkarte via Stripe.",
  robots: { index: true, follow: true },
};

export default function ZahlungPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Zahlungsmethoden
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Sichere und bewährte Zahlungsmöglichkeiten
      </p>

      <div className="space-y-6 text-sm leading-relaxed">
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Vorkasse / Überweisung</h3>
            </div>
            <p className="text-muted-foreground">
              Überweisen Sie den Rechnungsbetrag auf unser Bankkonto. Versand
              erfolgt nach Zahlungseingang.
            </p>
          </div>
          <div className="border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Kreditkarte (Stripe)</h3>
            </div>
            <p className="text-muted-foreground">
              Visa, Mastercard und American Express. Sofortiger Versand nach
              Zahlungsfreigabe.
            </p>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold">Vorkasse per Banküberweisung</h2>
          <p>
            Bei Wahl der Zahlungsart Vorkasse senden wir Ihnen unmittelbar nach
            Bestellabschluss eine Auftragsbestätigung mit unseren Bankdaten. Die
            Ware wird versendet, sobald der Rechnungsbetrag vollständig auf
            unserem Konto eingegangen ist. Bitte geben Sie bei der Überweisung
            Ihre Bestellnummer als Verwendungszweck an, damit wir die Zahlung
            schnell zuordnen können.
          </p>
          <div className="mt-4 p-4 border rounded-lg bg-muted/30">
            <p className="font-medium mb-1">Unsere Bankverbindung</p>
            <p className="text-muted-foreground">
              Kontoinhaber: {BANK_DETAILS.accountHolder}
              <br />
              IBAN: {BANK_DETAILS.iban}
              <br />
              BIC: {BANK_DETAILS.bic}
              <br />
              Bank: {BANK_DETAILS.bankName}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Kreditkarte über Stripe</h2>
          <p>
            Wir akzeptieren Visa, Mastercard und American Express. Die Zahlung
            wird über den PCI-DSS-zertifizierten Zahlungsdienstleister Stripe
            abgewickelt. Ihre Zahlungsdaten werden verschlüsselt direkt an
            Stripe übermittelt — wir selbst erhalten und speichern keine
            Kreditkartendaten. Nach erfolgreicher Freigabe wird die Bestellung
            sofort bearbeitet und versandt.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Sicherheit</h2>
          <ul className="list-none space-y-2">
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>
                Alle Datenübertragungen sind SSL/TLS-verschlüsselt (HTTPS).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>
                Zahlungsabwicklung über PCI-DSS-zertifizierten Anbieter
                (Stripe).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>
                Keine Speicherung von Kreditkartendaten auf unseren Servern.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>
                Transparente Preisangaben inklusive aller gesetzlichen
                Abgaben.
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Mehrwertsteuer</h2>
          <p>
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
