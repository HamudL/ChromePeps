import { ROADMAP_ROWS } from "./data";
import shared from "./shared.module.css";
import styles from "./Roadmap.module.css";

export function Roadmap() {
  return (
    <section className={`section-ink ${styles.roadmap}`} id="roadmap">
      <div className={shared.gridInk} />
      <div className={`${shared.container} ${styles.inner}`}>
        <div className={`reveal-up ${styles.head}`}>
          <div className={`mono-label ${shared.gold} ${shared.center}`}>
            <span className={shared.dot} />
            06 · ROADMAP
          </div>
          <h2>
            Was als Nächstes <span className={shared.accent}>verifizierbar</span>{" "}
            wird.
          </h2>
          <p className={styles.sub}>
            Eine Roadmap ist nur dann ehrlich, wenn auch die noch nicht erreichten
            Punkte darin stehen. Hier sind beide.
          </p>
        </div>

        <div className={`reveal-up ${styles.tl}`}>
          {ROADMAP_ROWS.map((row, i) => {
            const stateClass =
              row.state === "current"
                ? styles.current
                : row.state === "future"
                  ? styles.future
                  : "";
            return (
              <div className={`${styles.row} ${stateClass}`} key={`${row.title}-${i}`}>
                <div className={styles.q}>
                  <span className={styles.dot} />
                  {row.quarter}
                </div>
                <div className={styles.t}>{row.title}</div>
                <div className={styles.d}>{row.desc}</div>
                <div className={styles.s}>{row.status}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
