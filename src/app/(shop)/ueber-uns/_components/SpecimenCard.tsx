"use client";

import { useEffect, useRef } from "react";
import styles from "./SpecimenCard.module.css";

/**
 * Hero-Specimen-Card mit Maus-Parallax (setzt --mx/--my als CSS-Vars, die
 * das Vial-<img> via transform liest). rAF-lerp für weiche Bewegung;
 * `prefers-reduced-motion` schaltet den Effekt ab.
 *
 * Das Vial ist frame_120 unserer 120-Frame-Assembly (assembled, statisch).
 */
export function SpecimenCard({
  lotNumber,
  purityComma,
  testDate,
}: {
  lotNumber: string;
  purityComma: string;
  testDate: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = ref.current;
    if (!card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0,
      raf: number | null = null;

    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      card.style.setProperty("--mx", cx.toFixed(3));
      card.style.setProperty("--my", cy.toFixed(3));
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    };
    const onMove = (e: MouseEvent) => {
      const r = card.getBoundingClientRect();
      tx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      ty = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
    return () => {
      card.removeEventListener("mousemove", onMove);
      card.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.card} ref={ref}>
      <div className={styles.head}>
        <span>SPECIMEN · {lotNumber}</span>
        <span className={styles.live}>live</span>
      </div>
      <div className={styles.vial}>
        <span className={`${styles.caliper} ${styles.top}`}>
          <span>⌀ 22&nbsp;mm</span>
        </span>
        <span className={`${styles.caliper} ${styles.right}`}>
          ↕&nbsp;58&nbsp;mm · 10&nbsp;ml borosilikat
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- statisches WebP-Frame; next/image lohnt für ein einzelnes dekoratives Frame nicht */}
        <img src="/ueber-uns/vial-assembly/frame_120.webp" alt="ChromePeps Vial" />
        <span className={`${styles.caliper} ${styles.lot}`}>
          <b>LOT</b>&nbsp;{lotNumber} ·{" "}
          <span className={styles.pass}>HPLC {purityComma} %</span>
        </span>
        <span className={styles.stamp}>
          RUO<small>Research Use Only</small>
        </span>
      </div>
      <div className={styles.foot}>
        <div>
          <div className={styles.k}>Method</div>
          <div className={styles.v}>RP-HPLC · ESI-MS</div>
        </div>
        <div>
          <div className={styles.k}>Released</div>
          <div className={`${styles.v} ${styles.amber}`}>PASS · {testDate}</div>
        </div>
      </div>
    </div>
  );
}
