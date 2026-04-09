import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Widerrufsbelehrung",
  description:
    "Widerrufsrecht und Widerrufsformular gemäß § 355 BGB und Art. 246a EGBGB.",
  robots: { index: true, follow: true },
};

export default function WiderrufPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Widerrufsbelehrung
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Informationen zu Ihrem Widerrufsrecht als Verbraucher
      </p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">Widerrufsrecht</h2>
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
          <p className="mt-1 pl-4">
            [TODO: Firmenname]
            <br />
            [TODO: Straße und Hausnummer]
            <br />
            [TODO: PLZ Ort]
            <br />
            Telefon: [TODO: Telefonnummer]
            <br />
            E-Mail: [TODO: widerruf@chromepeps.com]
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
        </section>

        <section>
          <h2 className="text-lg font-semibold">Folgen des Widerrufs</h2>
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
        </section>

        <section>
          <h2 className="text-lg font-semibold">
            Ausschluss bzw. vorzeitiges Erlöschen des Widerrufsrechts
          </h2>
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
            [TODO: Prüfen lassen, ob unsere versiegelten Peptidprodukte unter
            den Hygieneausschluss nach § 312g Abs. 2 Nr. 3 BGB fallen — in dem
            Fall kann das Widerrufsrecht nach Öffnung der Versiegelung
            vorzeitig erlöschen.]
          </p>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold">Muster-Widerrufsformular</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses
            Formular aus und senden Sie es zurück.
          </p>
          <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
            <p>
              An
              <br />
              [TODO: Firmenname]
              <br />
              [TODO: Anschrift]
              <br />
              E-Mail: [TODO: widerruf@chromepeps.com]
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
            <p className="text-xs">(*) Unzutreffendes streichen.</p>
          </div>
        </section>

        <div className="mt-10 p-4 border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900 rounded-lg text-xs text-yellow-900 dark:text-yellow-200">
          <strong>Hinweis:</strong> Anwaltliche Prüfung vor Live-Schaltung
          dringend empfohlen, insbesondere der Hygieneausschluss für versiegelte
          Peptide.
        </div>
      </div>
    </div>
  );
}
