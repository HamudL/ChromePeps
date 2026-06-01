import { MANIFEST_FACTS } from "./data";
import shared from "./shared.module.css";
import styles from "./Manifest.module.css";

export function Manifest() {
  return (
    <section className={`section-ink ${styles.manifest}`} id="manifest">
      <div className={shared.gridInk} />
      <div className={shared.container}>
        <div className={styles.grid}>
          <div className={`reveal-up ${styles.head}`}>
            <div className={`mono-label ${shared.gold}`}>
              <span className={shared.dot} />
              01 · MANIFEST
            </div>
            <h2>
              Reinheit ist <span className={shared.accent}>kein Schlagwort.</span>
              <br />
              Es ist eine Messung.
            </h2>
          </div>

          <div className={`reveal-up ${styles.body}`}>
            <p>
              Der Markt für Forschungspeptide ist voll von Anbietern, die das Wort{" "}
              <b>Reinheit</b> als Schlagwort verwenden. Wir behandeln es als
              Messwert. Jede Charge, die unser Lager verlässt, trägt einen
              Datensatz: Reinheit per HPLC, Identität per Massenspektrometrie,
              eindeutige Lot-Nummer, Datum, Methode.
            </p>
            <p>
              Diese Daten gehören nicht uns. Sie gehören in jede Bestellung, in
              jede E-Mail, in jeden öffentlich verifizierbaren{" "}
              <span className={shared.accent}>Janoshik-Eintrag</span>. Transparenz
              ist die teuerste Marketing-Strategie und die einzige, die unter
              HPLC standhält.
            </p>
            <p>
              Wir geben keine Heilversprechen. Wir liefern <b>Material</b> nach{" "}
              <b>Methode</b>, mit <b>Beleg</b>. Was unsere Kunden damit anfangen,
              ist deren Wissenschaft.
            </p>
          </div>

          <aside className={`reveal-up ${styles.side}`}>
            <dl>
              {MANIFEST_FACTS.map(([dt, dd]) => (
                <div className={styles.row} key={dt}>
                  <dt>{dt}</dt>
                  <dd>{dd}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </section>
  );
}
