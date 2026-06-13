import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SELLER_DETAILS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Widerrufsbelehrung",
  description:
    "Widerrufsrecht und Widerrufsformular gemäß § 355 BGB und Art. 246a EGBGB.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/widerruf" },
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
        <div className="mt-2">{children}</div>
      </div>
    </section>
  );
}

export default function WiderrufPage() {
  return (
    <div className="container max-w-3xl section-pad">
      <header>
        <span className="eyebrow">Widerrufsrecht</span>
        <h1 className="display-title mt-3 text-4xl md:text-5xl">
          Widerrufsbelehrung
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Informationen zu Ihrem Widerrufsrecht als Verbraucher
        </p>
      </header>

      <div className="tick-rule mt-10" aria-hidden="true" />

      <div className="text-[15px] leading-relaxed text-foreground/90">
        <LegalSection no="01" title="Widerrufsrecht">
          <p>
            Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen
            diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn
            Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter,
            der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw.
            hat.
          </p>
          <p className="mt-2">
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
          </p>
          {/* Widerrufsadressat kommt zentral aus SELLER_DETAILS (env-basiert) —
              identisch mit Impressum und Rechnungs-PDF. */}
          <p className="mt-2 border-l-2 border-primary/40 pl-4">
            {SELLER_DETAILS.companyName}
            <br />
            {SELLER_DETAILS.streetLine1}
            <br />
            {SELLER_DETAILS.postalCodeCity}
            <br />
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
          <p className="mt-2">
            mittels einer eindeutigen Erklärung (z. B. ein mit der Post
            versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag
            zu widerrufen, informieren. Sie können dafür das beigefügte
            Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben
            ist.
          </p>
          <p className="mt-2">
            Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die
            Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der
            Widerrufsfrist absenden.
          </p>
        </LegalSection>

        <LegalSection no="02" title="Folgen des Widerrufs">
          <p>
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen,
            die wir von Ihnen erhalten haben, einschließlich der Lieferkosten
            (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass
            Sie eine andere Art der Lieferung als die von uns angebotene,
            günstigste Standardlieferung gewählt haben), unverzüglich und
            spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem
            die Mitteilung über Ihren Widerruf dieses Vertrags bei uns
            eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe
            Zahlungsmittel, das Sie bei der ursprünglichen Transaktion
            eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas
            anderes vereinbart; in keinem Fall werden Ihnen wegen dieser
            Rückzahlung Entgelte berechnet.
          </p>
          <p className="mt-2">
            Wir können die Rückzahlung verweigern, bis wir die Waren wieder
            zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass
            Sie die Waren zurückgesandt haben, je nachdem, welches der frühere
            Zeitpunkt ist.
          </p>
          <p className="mt-2">
            Sie haben die Waren unverzüglich und in jedem Fall spätestens
            binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf
            dieses Vertrags unterrichten, an uns zurückzusenden oder zu
            übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der
            Frist von vierzehn Tagen absenden.
          </p>
          <p className="mt-2">
            Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.
          </p>
          <p className="mt-2">
            Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen,
            wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit,
            Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang
            mit ihnen zurückzuführen ist.
          </p>
        </LegalSection>

        <LegalSection
          no="03"
          title="Ausschluss bzw. vorzeitiges Erlöschen des Widerrufsrechts"
        >
          <p>
            Das Widerrufsrecht besteht nicht bzw. erlischt vorzeitig bei
            folgenden Verträgen:
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>
              Zur Lieferung von Waren, die nicht vorgefertigt sind und für deren
              Herstellung eine individuelle Auswahl oder Bestimmung durch den
              Verbraucher maßgeblich ist oder die eindeutig auf die persönlichen
              Bedürfnisse des Verbrauchers zugeschnitten sind (§ 312g Abs. 2 Nr.
              1 BGB).
            </li>
            <li>
              Zur Lieferung versiegelter Waren, die aus Gründen des
              Gesundheitsschutzes oder der Hygiene nicht zur Rückgabe geeignet
              sind, wenn ihre Versiegelung nach der Lieferung entfernt wurde
              (§ 312g Abs. 2 Nr. 3 BGB).
            </li>
            <li>
              Zur Lieferung von Waren, die nach der Lieferung aufgrund ihrer
              Beschaffenheit untrennbar mit anderen Gütern vermischt wurden
              (§ 312g Abs. 2 Nr. 4 BGB).
            </li>
          </ul>
          <p className="mt-2 italic text-muted-foreground">
            [TODO: Anwaltlich prüfen lassen, ob unsere versiegelten
            Peptidprodukte unter den Hygieneausschluss nach § 312g Abs. 2 Nr. 3
            BGB fallen. Gegebenenfalls erlischt das Widerrufsrecht nach
            Öffnung der Versiegelung vorzeitig.]
          </p>
        </LegalSection>

        <LegalSection no="04" title="Muster-Widerrufsformular">
          <p className="text-xs text-muted-foreground mb-3">
            Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses
            Formular aus und senden Sie es zurück.
          </p>
          {/* Formular als Protokollblock — Mono-Satz wie ein Vordruck. */}
          <div className="space-y-2 border border-border bg-muted/40 p-5 font-mono text-[13px] leading-relaxed">
            <p>
              An
              <br />
              {SELLER_DETAILS.companyName}
              <br />
              {SELLER_DETAILS.streetLine1}, {SELLER_DETAILS.postalCodeCity}
              <br />
              E-Mail: {SELLER_DETAILS.email}
            </p>
            <p>
              Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
              Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der
              folgenden Dienstleistung (*):
            </p>
            <p>___________________________________________________</p>
            <p>Bestellt am (*) / erhalten am (*): __________________</p>
            <p>Name des/der Verbraucher(s): ______________________</p>
            <p>Anschrift des/der Verbraucher(s): __________________</p>
            <p>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</p>
            <p>Datum: __________________</p>
            <p className="text-xs text-muted-foreground">(*) Unzutreffendes streichen.</p>
          </div>
        </LegalSection>

        <div className="mt-10 border border-destructive/40 bg-destructive/5 p-4 text-xs leading-relaxed text-foreground/80">
          <span className="mono-label mb-2 block text-destructive">Hinweis</span>
          Anwaltliche Prüfung vor Live-Schaltung dringend empfohlen,
          insbesondere der Hygieneausschluss für versiegelte Peptide.
        </div>
      </div>
    </div>
  );
}
