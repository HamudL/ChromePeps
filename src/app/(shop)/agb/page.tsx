import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen",
  description:
    "AGB für den Verkauf von Forschungspeptiden und Laborbedarf durch ChromePeps.",
  robots: { index: true, follow: true },
};

export default function AgbPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Allgemeine Geschäftsbedingungen
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Stand: {new Date().toLocaleDateString("de-DE")}
      </p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">§ 1 Geltungsbereich</h2>
          <p>
            Für alle Bestellungen über unseren Online-Shop durch Verbraucher
            und Unternehmer gelten die nachfolgenden AGB. Verbraucher ist jede
            natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die
            überwiegend weder ihrer gewerblichen noch ihrer selbständigen
            beruflichen Tätigkeit zugerechnet werden können. Unternehmer ist
            eine natürliche oder juristische Person oder eine rechtsfähige
            Personengesellschaft, die bei Abschluss eines Rechtsgeschäfts in
            Ausübung ihrer gewerblichen oder selbständigen beruflichen Tätigkeit
            handelt.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">§ 2 Vertragspartner</h2>
          <p>
            Der Kaufvertrag kommt zustande mit [TODO: Firmenname], [TODO:
            Anschrift]. Weitere Informationen zu uns finden Sie im{" "}
            <Link href="/impressum" className="underline">
              Impressum
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">
            § 3 Vertragsschluss und Angebot
          </h2>
          <p>
            Die Darstellung der Produkte im Online-Shop stellt kein rechtlich
            bindendes Angebot dar, sondern eine Aufforderung zur Bestellung.
            Durch Anklicken des Bestellbuttons geben Sie eine verbindliche
            Bestellung der im Warenkorb enthaltenen Waren ab. Die Bestätigung
            des Eingangs der Bestellung erfolgt unmittelbar nach dem Absenden
            und stellt noch keine Vertragsannahme dar. Wir können Ihre
            Bestellung durch Versand einer Auftragsbestätigung per E-Mail oder
            durch Auslieferung der Ware innerhalb von drei Tagen annehmen.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">
            § 4 Besondere Bestimmungen für Forschungsprodukte
          </h2>
          <p>
            Sämtliche angebotenen Peptide und Chemikalien sind ausschließlich
            für wissenschaftliche Forschung und In-vitro-Verwendung bestimmt.
            Sie sind <strong>nicht für den menschlichen Gebrauch</strong>, nicht
            zur Diagnose, Behandlung, Heilung oder Vorbeugung von Krankheiten
            geeignet und dürfen weder als Arznei- noch als Lebensmittel oder
            kosmetisches Produkt verwendet werden. Mit der Bestellung bestätigen
            Sie, die Produkte ausschließlich zu Forschungszwecken zu verwenden
            und alle einschlägigen gesetzlichen Vorschriften einzuhalten.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">§ 5 Preise und Versandkosten</h2>
          <p>
            Die auf den Produktseiten angegebenen Preise enthalten die gesetzliche
            Mehrwertsteuer und sonstige Preisbestandteile. Zusätzlich zu den
            angegebenen Preisen berechnen wir für die Lieferung Versandkosten.
            Ab einem Bestellwert von 100 EUR liefern wir versandkostenfrei
            innerhalb Deutschlands; unterhalb dieses Werts fällt eine
            Versandkostenpauschale von 5,99 EUR an. Die genauen Konditionen
            finden Sie auf der{" "}
            <Link href="/versand" className="underline">
              Seite &bdquo;Versand&ldquo;
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">§ 6 Lieferung</h2>
          <p>
            Die Lieferung erfolgt, sofern nicht anders vereinbart, an die von
            Ihnen angegebene Lieferadresse. Die Lieferzeit beträgt, sofern beim
            jeweiligen Produkt nicht anders angegeben, innerhalb Deutschlands
            2–4 Werktage nach Zahlungseingang. Bei Zahlung per Vorkasse beginnt
            die Lieferzeit einen Tag nach Erteilung des Zahlungsauftrages an das
            überweisende Kreditinstitut.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">§ 7 Zahlung</h2>
          <p>
            Die Bezahlung erfolgt wahlweise per Vorkasse (Banküberweisung) oder
            über den Zahlungsdienstleister Stripe (Kreditkarte). Bei Vorkasse
            teilen wir Ihnen unsere Bankverbindung in der Auftragsbestätigung
            mit; die Ware wird nach Eingang des Rechnungsbetrages versandt.
            Weitere Informationen finden Sie auf der{" "}
            <Link href="/zahlung" className="underline">
              Seite &bdquo;Zahlung&ldquo;
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">§ 8 Eigentumsvorbehalt</h2>
          <p>
            Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">
            § 9 Widerrufsrecht für Verbraucher
          </h2>
          <p>
            Verbrauchern steht ein Widerrufsrecht nach Maßgabe der{" "}
            <Link href="/widerruf" className="underline">
              Widerrufsbelehrung
            </Link>{" "}
            zu.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">§ 10 Gewährleistung</h2>
          <p>
            Es gelten die gesetzlichen Gewährleistungsrechte. Die
            Gewährleistungsfrist für Verbraucher beträgt zwei Jahre ab Erhalt
            der Ware. Transportschäden bitten wir, unverzüglich gegenüber dem
            Transporteur zu reklamieren und uns zusätzlich mitzuteilen, damit
            wir die Rechte des Transporteurs wahrnehmen können.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">
            § 11 Anwendbares Recht und Gerichtsstand
          </h2>
          <p>
            Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss
            des UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur
            insoweit, als nicht der gewährte Schutz durch zwingende
            Bestimmungen des Rechts des Staates, in dem der Verbraucher seinen
            gewöhnlichen Aufenthalt hat, entzogen wird. Für Streitigkeiten mit
            Unternehmern ist Gerichtsstand [TODO: Sitz der Gesellschaft].
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">§ 12 Streitbeilegung</h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur
            Online-Streitbeilegung (OS) bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
            vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <div className="mt-10 p-4 border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900 rounded-lg text-xs text-yellow-900 dark:text-yellow-200">
          <strong>Hinweis:</strong> Dieser Text ist eine Vorlage und sollte vor
          Live-Schaltung durch einen Anwalt geprüft und an die tatsächlichen
          Geschäftsprozesse angepasst werden. Alle mit{" "}
          <code>[TODO: …]</code> markierten Stellen sind zu befüllen.
        </div>
      </div>
    </div>
  );
}
