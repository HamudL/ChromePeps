import { SELLER_DETAILS } from "@/lib/constants";
import { KONTAKT_FACTS, SUPPORT_EMAIL } from "./data";
import shared from "./shared.module.css";
import styles from "./Kontakt.module.css";

export function Kontakt() {
  // USt-ID/HR kommen zentral aus SELLER_DETAILS (env-basiert) statt als
  // "TODO:self"-Hardcode in data.ts. Die Ersetzung passiert bewusst HIER
  // (Server-Component) und nicht in data.ts: data.ts wird auch von
  // Client-Komponenten importiert, und SELLER_*-Variablen existieren nur
  // server-seitig (kein NEXT_PUBLIC_).
  const facts: ReadonlyArray<[string, string]> = KONTAKT_FACTS.map(
    ([k, v]): [string, string] => {
      if (k === "USt-ID") return [k, SELLER_DETAILS.vatId];
      if (k === "HR") return [k, SELLER_DETAILS.registerNumber];
      return [k, v];
    }
  );

  return (
    <section className={`hero-ambient ${styles.kontakt}`} id="kontakt">
      <div className={`subtle-grid ${shared.gridAbs}`} />
      <div className={`${shared.container} ${styles.inner}`}>
        <div className={`reveal-up`}>
          <div className={`mono-label ${shared.gold}`}>
            <span className={shared.dot} />
            07 · KONTAKT
          </div>
          <h2>
            Forschungsfragen.
            <br />
            Sortiments­anfragen.
            <br />
            <span className={shared.accent}>CoA-Verifikation.</span>
          </h2>
          <p className={styles.sub}>
            Wir antworten innerhalb eines Werktags, auf Deutsch oder Englisch.
            Kein Bot, kein Ticket-System.
          </p>
          <div className={styles.ctas}>
            <a className="btn-gold" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
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
            <a className="btn-ghost" href="/faq">
              FAQ ansehen
            </a>
          </div>
        </div>

        <aside className={`reveal-up ${styles.card}`}>
          <div className={styles.cardHead}>Firmendaten</div>
          <ul>
            {facts.map(([k, v]) => (
              <li key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
