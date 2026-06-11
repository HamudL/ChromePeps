import type { Metadata } from "next";
import Link from "next/link";
import {
  BANK_TRANSFER_ENABLED,
  SELLER_DETAILS,
  SELLER_DETAILS_INCOMPLETE,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description:
    "Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/datenschutz" },
};

export default function DatenschutzPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Datenschutzerklärung
      </h1>
      {/* Stand-Datum ist das tatsächliche Datum der letzten inhaltlichen
          Änderung — bei Anpassungen der Erklärung manuell mitziehen.
          new Date() (Abrufdatum) würde fälschlich tägliche Aktualität
          suggerieren. */}
      <p className="text-sm text-muted-foreground mb-8">Stand: 10. Juni 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">
            1. Verantwortlicher im Sinne der Datenschutzgesetze
          </h2>
          {/* Verantwortlicher kommt zentral aus SELLER_DETAILS (env-basiert) —
              identisch mit Impressum und Rechnungs-PDF. */}
          <p>
            {SELLER_DETAILS.companyName}
            <br />
            {SELLER_DETAILS.streetLine1}, {SELLER_DETAILS.postalCodeCity}
            <br />
            E-Mail:{" "}
            <a
              href={`mailto:${SELLER_DETAILS.email}`}
              className="underline"
            >
              {SELLER_DETAILS.email}
            </a>
          </p>
          <p className="mt-2">
            Weitere Angaben entnehmen Sie bitte unserem{" "}
            <Link href="/impressum" className="underline">
              Impressum
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Allgemeine Hinweise</h2>
          <p>
            Der Schutz Ihrer persönlichen Daten ist uns wichtig. Wir behandeln
            Ihre personenbezogenen Daten vertraulich und entsprechend der
            gesetzlichen Datenschutzvorschriften sowie dieser
            Datenschutzerklärung. Wenn Sie diese Website benutzen, werden
            verschiedene personenbezogene Daten erhoben. Personenbezogene Daten
            sind Daten, mit denen Sie persönlich identifiziert werden können.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">
            3. Erfassung und Verarbeitung personenbezogener Daten
          </h2>

          <h3 className="font-medium mt-3">3.1 Besuch der Website</h3>
          <p>
            Bei jedem Zugriff auf unsere Website werden automatisch Daten durch
            den Server erfasst und in sogenannten Server-Log-Dateien gespeichert:
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>IP-Adresse</li>
            <li>Datum und Uhrzeit der Anfrage</li>
            <li>Browsertyp und Browserversion</li>
            <li>Betriebssystem</li>
            <li>Referrer URL</li>
          </ul>
          <p className="mt-2">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
            am stabilen Betrieb und der Sicherheit der Website). Die Daten
            werden nach sieben Tagen automatisch gelöscht.
          </p>

          <h3 className="font-medium mt-3">3.2 Benutzerkonto und Bestellung</h3>
          <p>
            Für die Abwicklung Ihrer Bestellung erheben wir folgende Daten:
            Name, E-Mail, Rechnungs- und Lieferanschrift, Bestellhistorie,
            Zahlungsstatus. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO
            (Vertragserfüllung). Die Daten werden gelöscht, sobald sie für den
            Zweck ihrer Verarbeitung nicht mehr erforderlich sind, unter
            Beachtung gesetzlicher Aufbewahrungspflichten (§ 147 AO, § 257 HGB).
          </p>

          <h3 className="font-medium mt-3">3.3 Zahlungsabwicklung (Stripe)</h3>
          <p>
            Für Kreditkarten- und sonstige Online-Zahlungen nutzen wir den
            Zahlungsdienstleister Stripe Payments Europe, Ltd., 1 Grand Canal
            Street Lower, Grand Canal Dock, Dublin, Irland. Zahlungsdaten
            (Kreditkartennummer, Name, Betrag etc.) werden ausschließlich direkt
            an Stripe übermittelt und von Stripe verarbeitet. Wir selbst erhalten
            keine Kreditkartendaten. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
            Weitere Informationen:{" "}
            <a
              href="https://stripe.com/de/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              https://stripe.com/de/privacy
            </a>
            .
          </p>

          {BANK_TRANSFER_ENABLED && (
            <>
              <h3 className="font-medium mt-3">3.4 Zahlung per Vorkasse</h3>
              <p>
                Bei Wahl der Zahlungsart Vorkasse übermitteln wir Ihre
                Bestellinformationen an unsere Bank zur Zuordnung der Zahlung.
                Die Kontodaten sehen Sie im Bestellprozess sowie in der
                Bestellbestätigung.
              </p>
            </>
          )}

          <h3 className="font-medium mt-3">3.5 Kundenkonto und Session</h3>
          <p>
            Für die Anmeldung verwenden wir NextAuth mit einer Session, die über
            ein technisch notwendiges Cookie gehalten wird. Dieses Cookie ist
            essentiell für den Login und kann nicht deaktiviert werden.
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO bzw. § 25 Abs. 2 Nr. 2
            TTDSG.
          </p>
        </section>

        {/* Abschnitt 4 muss zur tatsächlichen Technik passen: GA4 wird im
            Shop-Layout consent-gated geladen (components/analytics/
            google-analytics.tsx rendert erst nach "Akzeptieren" im Cookie-
            Banner), Plausible läuft cookielos im Root-Layout. Die frühere
            Aussage "Statistik derzeit nicht im Einsatz" war falsch. */}
        <section>
          <h2 className="text-lg font-semibold">
            4. Cookies und Statistik
          </h2>
          <p>
            Unsere Website verwendet Cookies. Cookies sind kleine Textdateien,
            die auf Ihrem Endgerät gespeichert werden. Wir unterscheiden:
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>
              <strong>Essentielle Cookies:</strong> technisch notwendig für
              Login, Warenkorb und Checkout (§ 25 Abs. 2 Nr. 2 TTDSG).
            </li>
            <li>
              <strong>Statistik (Google Analytics 4):</strong> wird
              ausschließlich geladen, wenn Sie über das Cookie-Banner
              eingewilligt haben (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1
              TTDSG). Anbieter: Google Ireland Limited, Gordon House, Barrow
              Street, Dublin 4, Irland. Die IP-Adresse wird dabei anonymisiert.
              Bei Ablehnung wird Google Analytics nicht geladen; eine erteilte
              Einwilligung können Sie jederzeit mit Wirkung für die Zukunft
              widerrufen, indem Sie die Cookies dieser Website löschen.
            </li>
          </ul>
          <p className="mt-2">
            Zusätzlich setzen wir eine selbst gehostete, cookielose
            Reichweitenmessung (Plausible Analytics) ein. Sie speichert keine
            Cookies, bildet keine personenbezogenen Profile und erfasst keine
            seitenübergreifenden Identifier. Rechtsgrundlage: Art. 6 Abs. 1
            lit. f DSGVO (berechtigtes Interesse an einer datensparsamen
            Reichweitenanalyse).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Ihre Rechte</h2>
          <p>
            Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie
            betreffenden personenbezogenen Daten:
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
            <li>
              Recht auf Widerruf einer erteilten Einwilligung (Art. 7 Abs. 3
              DSGVO)
            </li>
          </ul>
          <p className="mt-2">
            Zur Ausübung Ihrer Rechte genügt eine formlose Nachricht an{" "}
            <a
              href={`mailto:${SELLER_DETAILS.email}`}
              className="underline"
            >
              {SELLER_DETAILS.email}
            </a>
            . Ferner haben Sie das Recht, sich
            bei einer Datenschutzaufsichtsbehörde über die Verarbeitung Ihrer
            personenbezogenen Daten zu beschweren (Art. 77 DSGVO).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. SSL-/TLS-Verschlüsselung</h2>
          <p>
            Diese Website nutzt aus Sicherheitsgründen und zum Schutz der
            Übertragung vertraulicher Inhalte eine SSL-/TLS-Verschlüsselung. Sie
            erkennen eine verschlüsselte Verbindung an dem Schloss-Symbol in
            Ihrer Browserzeile und dem https:// am Beginn der Adressleiste.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">
            7. Änderungen dieser Datenschutzerklärung
          </h2>
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung gelegentlich
            anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen
            entspricht oder um Änderungen unserer Leistungen in der
            Datenschutzerklärung umzusetzen.
          </p>
        </section>

        {/* Hinweisbox nur solange noch Platzhalter sichtbar sind — sobald
            alle SELLER_*-Variablen gesetzt sind, verschwindet sie von selbst. */}
        {SELLER_DETAILS_INCOMPLETE && (
          <div className="mt-10 p-4 border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900 rounded-lg text-xs text-yellow-900 dark:text-yellow-200">
            <strong>Hinweis an den Seitenbetreiber:</strong> Felder mit{" "}
            <code>[TODO: …]</code> kommen zentral aus den{" "}
            <code>SELLER_*</code>-Umgebungsvariablen (siehe .env.example) und
            müssen vor Live-Schaltung gesetzt werden. Bei Einbindung weiterer
            Dienste (Sentry, Newsletter, etc.) muss diese Datenschutzerklärung
            ergänzt werden.
          </div>
        )}
      </div>
    </div>
  );
}
