import type { UeberUnsData } from "./types";
import { HplcFigure } from "./HplcFigure";
import shared from "./shared.module.css";
import styles from "./Labor.module.css";

export function Labor({ data }: { data: UeberUnsData }) {
  return (
    <section className={styles.labor} id="labor">
      <div className={`apo-grid ${styles.bg}`} />
      <div className={`${shared.container} ${styles.inner}`}>
        <div className={`reveal-up ${styles.copy}`}>
          <div className={`mono-label ${shared.gold}`}>
            <span className={shared.dot} />
            04 · EVIDENZ · NICHT MARKETING
          </div>
          <h2>
            So sieht ein <span className={shared.accent}>„passed“</span> Lot aus.
          </h2>
          <p className={styles.lead}>
            Echtes HPLC-Chromatogramm einer ChromePeps-Charge. Der Haupt-Peak bei{" "}
            <span className={styles.tab}>
              t<sub>R</sub> = 5,82 min
            </span>{" "}
            ist das Zielpeptid. Die Fläche unter der Kurve im Verhältnis zur
            Gesamt­fläche gibt die Reinheit:{" "}
            <b className={styles.gold}>{data.purityComma} %</b>.
          </p>
          <ul className={styles.points}>
            <li>
              <div>
                <b>Säule:</b> C18, 4,6 × 250 mm, 5 µm
              </div>
            </li>
            <li>
              <div>
                <b>Fluss:</b> 1,0 ml/min · UV 220 nm
              </div>
            </li>
            <li>
              <div>
                <b>Gradient:</b> 0,1 % TFA / Acetonitril, 5 → 60 % über 10 min
              </div>
            </li>
            <li>
              <div>
                <b>Referenz:</b> Janoshik MS-Library · Match-Score 0,997
              </div>
            </li>
          </ul>
          <div className={styles.cta}>
            <a className="btn-gold" href="#kontakt">
              CoA-Beispiel ansehen
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2 7h10m0 0L8 3m4 4L8 11"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>

        {/* Chromatogramm-Card nur mit ECHTEN Showcase-Daten rendern —
            ohne veröffentlichte COA keine fabrizierten Messwerte. */}
        {data.lotNumber && data.purityComma && data.testDate && (
          <HplcFigure
            lotNumber={data.lotNumber}
            purityComma={data.purityComma}
            testDate={data.testDate}
          />
        )}
      </div>
    </section>
  );
}
