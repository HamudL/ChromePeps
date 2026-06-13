import type { Metadata } from "next";
import type { ReactNode } from "react";
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

/** Rechtstext-Abschnitt mit dekorativer Mono-Ordnungszahl in der Marginalie. */
function LegalSection({
  no,
  title,
  children,
}: {
  no: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-x-8 gap-y-2 border-b border-border py-7 last:border-b-0 sm:grid-cols-[64px_1fr]">
      <span className="mono-label pt-1 text-primary-strong" aria-hidden="true">
        {no}
      </span>
      <div>
        <h2 className="display-title text-xl text-foreground">{title}</h2>
        <div className="mt-2 space-y-2">{children}</div>
      </div>
    </section>
  );
}

export default function ImpressumPage() {
  return (
    <div className="container max-w-3xl section-pad">
      <header>
        <span className="eyebrow">Anbieterkennzeichnung</span>
        <h1 className="display-title mt-3 text-4xl md:text-5xl">Impressum</h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Angaben gemäß § 5 TMG
        </p>
      </header>

      <div className="tick-rule mt-10" aria-hidden="true" />

      <div className="text-[15px] leading-relaxed text-foreground/90">
        {/* Alle Anbieter-Angaben kommen zentral aus SELLER_DETAILS
            (env-basiert, src/lib/constants.ts) — Rechnungs-PDF, Kontakt-
            und Rechtsseiten zeigen damit garantiert dieselben Daten. */}
        <LegalSection no="01" title="Anbieter">
          <p>
            <strong>{SELLER_DETAILS.companyName}</strong>
            <br />
            {SELLER_DETAILS.streetLine1}
            <br />
            {SELLER_DETAILS.postalCodeCity}
            <br />
            {SELLER_DETAILS.country}
          </p>
        </LegalSection>

        <LegalSection no="02" title="Vertreten durch">
          <p>
            Geschäftsführer: {SELLER_DETAILS.managingDirector}
          </p>
        </LegalSection>

        <LegalSection no="03" title="Kontakt">
          <p>
            Telefon: {SELLER_DETAILS.phone}
            <br />
            E-Mail:{" "}
            <a
              href={`mailto:${SELLER_DETAILS.email}`}
              className="text-primary-strong underline-offset-2 hover:underline"
            >
              {SELLER_DETAILS.email}
            </a>
          </p>
        </LegalSection>

        <LegalSection no="04" title="Registereintrag">
          <p>
            Eintragung im Handelsregister.
            <br />
            Registergericht: {SELLER_DETAILS.registerCourt}
            <br />
            Registernummer: {SELLER_DETAILS.registerNumber}
          </p>
        </LegalSection>

        <LegalSection no="05" title="Umsatzsteuer-ID">
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
            <br />
            {SELLER_DETAILS.vatId}
          </p>
        </LegalSection>

        <LegalSection
          no="06"
          title="Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV"
        >
          <p>
            {SELLER_DETAILS.managingDirector}
            <br />
            {SELLER_DETAILS.streetLine1}
            <br />
            {SELLER_DETAILS.postalCodeCity}
          </p>
        </LegalSection>

        <LegalSection
          no="07"
          title="Verbraucherstreitbeilegung / Universalschlichtungsstelle"
        >
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
              className="break-words text-primary-strong underline-offset-2 hover:underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
        </LegalSection>

        <LegalSection no="08" title="Haftung für Inhalte">
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte
            auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
            §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
            überwachen oder nach Umständen zu forschen, die auf eine
            rechtswidrige Tätigkeit hinweisen.
          </p>
        </LegalSection>

        <LegalSection no="09" title="Haftung für Links">
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren
            Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
            fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
            verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
            Seiten verantwortlich.
          </p>
        </LegalSection>

        <LegalSection no="10" title="Urheberrecht">
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
            diesen Seiten unterliegen dem deutschen Urheberrecht.
            Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
            Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
            schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          </p>
        </LegalSection>

        {/* Hinweisbox nur solange noch Platzhalter sichtbar sind — sobald
            alle SELLER_*-Variablen gesetzt sind, verschwindet sie von selbst. */}
        {SELLER_DETAILS_INCOMPLETE && (
          <div className="mt-10 border border-destructive/40 bg-destructive/5 p-4 text-xs leading-relaxed text-foreground/80">
            <span className="mono-label mb-2 block text-destructive">
              Hinweis an den Seitenbetreiber
            </span>
            Felder mit <code>[TODO: …]</code> kommen zentral aus den{" "}
            <code>SELLER_*</code>-Umgebungsvariablen (siehe .env.example) und
            müssen vor Live-Schaltung gesetzt werden. Solange Platzhalter
            sichtbar sind, ist die Seite nicht rechtssicher.
          </div>
        )}
      </div>
    </div>
  );
}
