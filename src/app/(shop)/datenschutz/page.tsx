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

// force-dynamic: Diese Seite liest Runtime-Env (SELLER_*/BANK_*-Stamm-
// daten). Statisches Prerender wuerde die LEERE CI-Build-Env backen und
// der fluechtige ISR-Cache (.next/cache liegt auf keinem Volume) wuerde
// die Platzhalter-Version nach JEDEM Deploy/Restart erneut servieren -
// auf Pflichtseiten inakzeptabel. Ohne DB-Zugriff ist per-Request-
// Rendering hier ohnehin praktisch kostenlos.
export const dynamic = "force-dynamic";

export default function DatenschutzPage() {
  return (
    <div className="container max-w-3xl section-pad">
      <header>
        <span className="eyebrow">Datenschutz</span>
        <h1 className="display-title mt-3 text-4xl md:text-5xl">
          Datenschutzerklärung
        </h1>
        {/* Stand-Datum ist das tatsächliche Datum der letzten inhaltlichen
            Änderung — bei Anpassungen der Erklärung manuell mitziehen.
            new Date() (Abrufdatum) würde fälschlich tägliche Aktualität
            suggerieren. */}
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Stand: 10. Juni 2026
        </p>
      </header>

      <div className="tick-rule mt-10" aria-hidden="true" />

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground/90">
        <section>
          <h2 className="display-title text-xl text-foreground">
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
              className="text-primary-strong underline-offset-2 hover:underline"
            >
              {SELLER_DETAILS.email}
            </a>
          </p>
          <p className="mt-2">
            Weitere Angaben entnehmen Sie bitte unserem{" "}
            <Link href="/impressum" className="text-primary-strong underline-offset-2 hover:underline">
              Impressum
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="display-title text-xl text-foreground">2. Allgemeine Hinweise</h2>
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
          <h2 className="display-title text-xl text-foreground">
            3. Erfassung und Verarbeitung personenbezogener Daten
          </h2>

          <h3 className="mt-4 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-foreground">3.1 Besuch der Website</h3>
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

          <h3 className="mt-4 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-foreground">3.2 Benutzerkonto und Bestellung</h3>
          <p>
            Für die Abwicklung Ihrer Bestellung erheben wir folgende Daten:
            Name, E-Mail, Rechnungs- und Lieferanschrift, Bestellhistorie,
            Zahlungsstatus. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO
            (Vertragserfüllung). Die Daten werden gelöscht, sobald sie für den
            Zweck ihrer Verarbeitung nicht mehr erforderlich sind, unter
            Beachtung gesetzlicher Aufbewahrungspflichten (§ 147 AO, § 257 HGB).
          </p>

          <h3 className="mt-4 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-foreground">3.3 Zahlungsabwicklung (Stripe)</h3>
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
              className="break-words text-primary-strong underline-offset-2 hover:underline"
            >
              https://stripe.com/de/privacy
            </a>
            .
          </p>

          {BANK_TRANSFER_ENABLED && (
            <>
              <h3 className="mt-4 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-foreground">3.4 Zahlung per Vorkasse</h3>
              <p>
                Bei Wahl der Zahlungsart Vorkasse übermitteln wir Ihre
                Bestellinformationen an unsere Bank zur Zuordnung der Zahlung.
                Die Kontodaten sehen Sie im Bestellprozess sowie in der
                Bestellbestätigung.
              </p>
            </>
          )}

          <h3 className="mt-4 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-foreground">3.5 Kundenkonto und Session</h3>
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
          <h2 className="display-title text-xl text-foreground">
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
          <h2 className="display-title text-xl text-foreground">5. Ihre Rechte</h2>
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
              className="text-primary-strong underline-offset-2 hover:underline"
            >
              {SELLER_DETAILS.email}
            </a>
            . Ferner haben Sie das Recht, sich
            bei einer Datenschutzaufsichtsbehörde über die Verarbeitung Ihrer
            personenbezogenen Daten zu beschweren (Art. 77 DSGVO).
          </p>
        </section>

        <section>
          <h2 className="display-title text-xl text-foreground">6. SSL-/TLS-Verschlüsselung</h2>
          <p>
            Diese Website nutzt aus Sicherheitsgründen und zum Schutz der
            Übertragung vertraulicher Inhalte eine SSL-/TLS-Verschlüsselung. Sie
            erkennen eine verschlüsselte Verbindung an dem Schloss-Symbol in
            Ihrer Browserzeile und dem https:// am Beginn der Adressleiste.
          </p>
        </section>

        <section>
          <h2 className="display-title text-xl text-foreground">
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
          <div className="mt-10 border border-destructive/40 bg-destructive/5 p-4 text-xs leading-relaxed text-foreground/80">
            <span className="mono-label mb-2 block text-destructive">
              Hinweis an den Seitenbetreiber
            </span>
            Felder mit <code>[TODO: …]</code> kommen zentral aus den{" "}
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
