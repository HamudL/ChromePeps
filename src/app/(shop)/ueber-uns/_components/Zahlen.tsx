import type { UeberUnsData } from "./types";
import { METRICS, type Metric } from "./data";
import { CountUp } from "./CountUp";
import shared from "./shared.module.css";
import styles from "./Zahlen.module.css";

function metricValue(source: Metric["source"], data: UeberUnsData): number | null {
  if (source === "avgPurity") return data.avgPurity;
  if (source === "chargenCount") return data.chargenCount;
  return source;
}

export function Zahlen({ data }: { data: UeberUnsData }) {
  return (
    <section className={styles.zahlen} id="zahlen">
      <div className={shared.container}>
        <div className={`reveal-up ${styles.head}`}>
          <div className={`mono-label ${shared.gold} ${shared.center}`}>
            <span className={shared.dot} />
            05 · IN ZAHLEN
          </div>
          <h2>
            Operationelle Realität, <span className={shared.accent}>2026.</span>
          </h2>
          <p className={styles.sub}>
            Werte aus dem laufenden Janoshik-Verifikations­fluss, keine
            Hochrechnungen.
          </p>
        </div>

        <div className={styles.grid}>
          {METRICS.map((m) => (
            <div className={`reveal-up ${styles.metric}`} key={m.fig}>
              <div className={styles.num}>{m.fig}</div>
              <div className={styles.v}>
                <CountUp
                  value={metricValue(m.source, data)}
                  decimals={m.decimals}
                  suffix={m.suffix}
                />
              </div>
              <div className={styles.lbl}>{m.label}</div>
              <div className={styles.desc}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
