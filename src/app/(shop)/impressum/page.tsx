import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Anbieterkennzeichnung gemäß § 5 TMG.",
  robots: { index: true, follow: true },
};

export default function ImpressumPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Impressum</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Angaben gemäß § 5 TMG
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">Anbieter</h2>
          <p>
            <strong>[TODO: Firmenname einfügen, z. B. ChromePeps GmbH]</strong>
            <br />
            [TODO: Straße und Hausnummer]
            <br />
            [TODO: PLZ Ort]
            <br />
            Deutschland
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Vertreten durch</h2>
          <p>
            Geschäftsführer: [TODO: Vor- und Nachname des Geschäftsführers]
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Kontakt</h2>
          <p>
            Telefon: [TODO: Telefonnummer]
            <br />
            E-Mail: [TODO: kontakt@chromepeps.com]
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Registereintrag</h2>
          <p>
            Eintragung im Handelsregister.
            <br />
            Registergericht: [TODO: Amtsgericht, z. B. Amtsgericht Berlin (Charlottenburg)]
            <br />
            Registernummer: [TODO: HRB XXXXXX]
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
            <br />
            [TODO: DE XXXXXXXXX]
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
          </h2>
          <p>
            [TODO: Vor- und Nachname]
            <br />
            [TODO: Anschrift wie oben]
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">
            Verbraucherstreitbeilegung / Universalschlichtungsstelle
          </h2>
          <p>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
            vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
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
            . Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Haftung für Inhalte</h2>
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte
            auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
            §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
            überwachen oder nach Umständen zu forschen, die auf eine
            rechtswidrige Tätigkeit hinweisen.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Haftung für Links</h2>
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren
            Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
            fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
            verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
            Seiten verantwortlich.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Urheberrecht</h2>
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
            diesen Seiten unterliegen dem deutschen Urheberrecht.
            Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
            Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
            schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          </p>
        </section>

        <div className="mt-10 p-4 border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900 rounded-lg text-xs text-yellow-900 dark:text-yellow-200">
          <strong>Hinweis an den Seitenbetreiber:</strong> Alle mit{" "}
          <code>[TODO: …]</code> markierten Felder müssen vor Live-Schaltung
          durch echte Daten ersetzt werden. Solange Platzhalter sichtbar sind,
          ist die Seite nicht rechtssicher.
        </div>
      </div>
    </div>
  );
}
