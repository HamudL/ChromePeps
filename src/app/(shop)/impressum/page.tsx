import type { Metadata } from "next";
import {
  SELLER_DETAILS,
  SELLER_DETAILS_INCOMPLETE,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Anbieterkennzeichnung gemäß § 5 TMG.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/impressum" },
};

// force-dynamic: Diese Seite liest Runtime-Env (SELLER_*/BANK_*-Stamm-
// daten). Statisches Prerender wuerde die LEERE CI-Build-Env backen und
// der fluechtige ISR-Cache (.next/cache liegt auf keinem Volume) wuerde
// die Platzhalter-Version nach JEDEM Deploy/Restart erneut servieren -
// auf Pflichtseiten inakzeptabel. Ohne DB-Zugriff ist per-Request-
// Rendering hier ohnehin praktisch kostenlos.
export const dynamic = "force-dynamic";

export default function ImpressumPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Impressum</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Angaben gemäß § 5 TMG
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed">
        {/* Alle Anbieter-Angaben kommen zentral aus SELLER_DETAILS
            (env-basiert, src/lib/constants.ts) — Rechnungs-PDF, Kontakt-
            und Rechtsseiten zeigen damit garantiert dieselben Daten. */}
        <section>
          <h2 className="text-lg font-semibold">Anbieter</h2>
          <p>
            <strong>{SELLER_DETAILS.companyName}</strong>
            <br />
            {SELLER_DETAILS.streetLine1}
            <br />
            {SELLER_DETAILS.postalCodeCity}
            <br />
            {SELLER_DETAILS.country}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Vertreten durch</h2>
          <p>
            Geschäftsführer: {SELLER_DETAILS.managingDirector}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Kontakt</h2>
          <p>
            Telefon: {SELLER_DETAILS.phone}
            <br />
            E-Mail:{" "}
            <a
              href={`mailto:${SELLER_DETAILS.email}`}
              className="underline"
            >
              {SELLER_DETAILS.email}
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Registereintrag</h2>
          <p>
            Eintragung im Handelsregister.
            <br />
            Registergericht: {SELLER_DETAILS.registerCourt}
            <br />
            Registernummer: {SELLER_DETAILS.registerNumber}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
            <br />
            {SELLER_DETAILS.vatId}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
          </h2>
          <p>
            {SELLER_DETAILS.managingDirector}
            <br />
            {SELLER_DETAILS.streetLine1}
            <br />
            {SELLER_DETAILS.postalCodeCity}
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

        {/* Hinweisbox nur solange noch Platzhalter sichtbar sind — sobald
            alle SELLER_*-Variablen gesetzt sind, verschwindet sie von selbst. */}
        {SELLER_DETAILS_INCOMPLETE && (
          <div className="mt-10 p-4 border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900 rounded-lg text-xs text-yellow-900 dark:text-yellow-200">
            <strong>Hinweis an den Seitenbetreiber:</strong> Felder mit{" "}
            <code>[TODO: …]</code> kommen zentral aus den{" "}
            <code>SELLER_*</code>-Umgebungsvariablen (siehe .env.example) und
            müssen vor Live-Schaltung gesetzt werden. Solange Platzhalter
            sichtbar sind, ist die Seite nicht rechtssicher.
          </div>
        )}
      </div>
    </div>
  );
}
