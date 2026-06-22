import type { CSSProperties } from "react";
import { MANIFEST_TENETS } from "./data";
import shared from "./shared.module.css";
import styles from "./Manifest.module.css";

/**
 * Manifest: full-viewport "section-ink"-Sektion als echtes Manifest. Ein
 * großer Glaubenssatz oben, darunter fünf nummerierte Grundsätze (editorial,
 * Hairline-getrennt, gestaffeltes Reveal), abgeschlossen mit einer Signatur.
 * Bewusst keine Firmen-Eckdaten mehr: die gehören in die Kontakt-Sektion, ein
 * Manifest bekennt sich zu Prinzipien, es listet keine Stammdaten.
 */
export function Manifest() {
  return (
    <section className={`section-ink ${styles.manifest}`} id="manifest">
      <div className={shared.gridInk} />
      <div className={`${shared.container} ${styles.inner}`}>
        <header className={`reveal-up ${styles.head}`}>
          <div className={`mono-label ${shared.gold}`}>
            <span className={shared.dot} />
            01 · MANIFEST
          </div>
          <h2 className={styles.creed}>
            Wir verkaufen keine Versprechen.
            <br />
            Wir liefern <span className={shared.accent}>Messwerte</span>.
          </h2>
        </header>

        <ol className={styles.tenets}>
          {MANIFEST_TENETS.map((t, i) => (
            <li
              className={`reveal-up ${styles.tenet}`}
              key={t.no}
              style={{ "--fade-delay": `${0.06 * i}s` } as CSSProperties}
            >
              <span className={styles.num} aria-hidden="true">
                {t.no}
              </span>
              <div className={styles.tenetBody}>
                <h3 className={styles.statement}>{t.statement}</h3>
                <p className={styles.detail}>{t.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <footer className={`reveal-up ${styles.sign}`}>
          <span className={styles.signLine} aria-hidden="true" />
          <span className={styles.signText}>Gemessen, nicht versprochen.</span>
          <span className={styles.signMark}>ChromePeps</span>
        </footer>
      </div>
    </section>
  );
}
