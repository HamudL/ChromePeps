import type { CSSProperties } from "react";
import type { UeberUnsData } from "./types";
import { CountUp } from "./CountUp";
import { SpecimenCard } from "./SpecimenCard";
import styles from "./Hero.module.css";

const delay = (s: number) => ({ "--fade-delay": `${s}s` }) as CSSProperties;

/** Pfeil-Glyph der Gold-CTAs (aus dem Original-Design übernommen). */
function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2 7h10m0 0L8 3m4 4L8 11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Hero({ data }: { data: UeberUnsData }) {
  return (
    <section className={`hero-ambient ${styles.hero}`} id="top">
      <div className={`subtle-grid ${styles.grid}`} />
      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={`${styles.enter} ${styles.kicker}`}>Über uns · Mai 2026</div>
          <h1 className={`${styles.enter} ${styles.title}`} style={delay(0.06)}>
            {"Reinheit, gemessen\nnicht versprochen."}
          </h1>
          <p className={`${styles.enter} ${styles.sub}`} style={delay(0.12)}>
            ChromePeps liefert Forschungspeptide nach veröffentlichter Methode.
            Jede Charge erhält eine Lot-Nummer; jede Lot-Nummer ein
            HPLC-Chromatogramm von Janoshik Analytical. Was Sie auf dem Etikett
            lesen, hat ein unabhängiges Labor gemessen, nicht wir.
          </p>
          <div className={`${styles.enter} ${styles.ctas}`} style={delay(0.18)}>
            <a className="btn-gold" href="#labor">
              Wie wir testen
              <Arrow />
            </a>
            <a className="btn-ghost" href="#manifest">
              Unser Manifest
            </a>
          </div>

          <div className={`${styles.enter} ${styles.meta}`} style={delay(0.24)}>
            <div className={styles.metaItem}>
              <div className={styles.v}>
                <CountUp value={data.avgPurity} decimals={2} suffix="%" />
              </div>
              <div className={styles.k}>Ø HPLC-Reinheit · 2026</div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.v}>
                <CountUp value={data.chargenCount} decimals={0} />
              </div>
              <div className={styles.k}>Chargen freigegeben</div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.v}>
                <CountUp value={100} decimals={0} suffix="%" />
              </div>
              <div className={styles.k}>3rd-Party verifiziert</div>
            </div>
          </div>
        </div>

        <div className={styles.enter} style={delay(0.2)}>
          <SpecimenCard
            lotNumber={data.lotNumber}
            purityComma={data.purityComma}
            testDate={data.testDate}
          />
        </div>
      </div>
    </section>
  );
}
