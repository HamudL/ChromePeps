import { Package, Microscope, ShieldCheck, Mail } from "lucide-react";
import { PROZESS_STEPS, type ProzessStep } from "./data";
import shared from "./shared.module.css";
import styles from "./Prozess.module.css";

const ICONS: Record<ProzessStep["icon"], typeof Package> = {
  package: Package,
  microscope: Microscope,
  shield: ShieldCheck,
  mail: Mail,
};

export function Prozess() {
  return (
    <section className={`section-ink ${styles.prozess}`} id="prozess">
      <div className={shared.gridInk} />
      <div className={`${shared.container} ${styles.inner} reveal-up`}>
        <div className={`mono-label ${shared.gold} ${shared.center}`}>
          <span className={shared.dot} />
          03 · DER PROZESS
        </div>
        <h2>Vom Eingang zum Etikett in vier verifizierten Schritten.</h2>
        <p className={styles.sub}>Keine Abkürzungen. Keine Ausnahmen. Keine „Sonderchargen“.</p>

        <div className={styles.grid}>
          {PROZESS_STEPS.map((step, i) => {
            const Icon = ICONS[step.icon];
            return (
              <div className={styles.step} key={step.title}>
                <span className={styles.stepN}>{i + 1}</span>
                <span className={styles.iconWrap}>
                  <Icon strokeWidth={1.8} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <div className={styles.tags}>
                  {step.tags.map((t) => (
                    <span
                      className={`${styles.tag} ${t.pass ? styles.tagPass : ""}`}
                      key={t.text}
                    >
                      {t.text}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
