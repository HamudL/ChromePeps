"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { UeberUnsData } from "./types";
import { CountUp } from "./CountUp";
import { HeroBackdrop } from "./HeroBackdrop";
import styles from "./HeroCinematic.module.css";

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/**
 * Cinematischer Hero (neue Design-Sprache): WebGL-Gold-Atmosphäre, kinetische
 * Masken-Typo, das Vial dramatisch beleuchtet mit Scan + Maus-Parallax, und
 * ein Instrument-Readout der Live-COA-Kennzahlen.
 */
export function HeroCinematic({ data }: { data: UeberUnsData }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: MouseEvent) => {
      const r = stage.getBoundingClientRect();
      const mx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const my = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      stage.style.setProperty("--mx", mx.toFixed(3));
      stage.style.setProperty("--my", my.toFixed(3));
    };
    const onLeave = () => {
      stage.style.setProperty("--mx", "0");
      stage.style.setProperty("--my", "0");
    };
    window.addEventListener("mousemove", onMove);
    stage.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      stage.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <section className={styles.hero} id="top">
      <HeroBackdrop className={styles.backdrop} />
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}>Research-Use-Only · Janoshik-verifiziert · Est. 2026</div>

          <h1 className={styles.title}>
            <span className={styles.line}>
              <span className={styles.lineInner} style={d(0)}>
                Reinheit,
              </span>
            </span>
            <span className={styles.line}>
              <span className={styles.lineInner} style={d(0.12)}>
                <span className={styles.gold}>gemessen.</span>
              </span>
            </span>
            <span className={styles.line}>
              <span className={styles.lineInner} style={d(0.24)}>
                Nicht versprochen.
              </span>
            </span>
          </h1>

          <div className={styles.ctas}>
            <a className={`${styles.cta} ${styles.ctaGold}`} href="#labor">
              Wie wir testen
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
            <a className={`${styles.cta} ${styles.ctaGhost}`} href="#manifest">
              Unser Manifest
            </a>
          </div>

          <div className={styles.console}>
            <div className={styles.stat}>
              <div className={styles.v}>
                <CountUp value={data.avgPurity} decimals={2} suffix="%" />
              </div>
              <div className={styles.k}>Ø HPLC-Reinheit</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.v}>
                <CountUp value={data.chargenCount} decimals={0} />
              </div>
              <div className={styles.k}>Chargen freigegeben</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.v}>
                <CountUp value={100} decimals={0} suffix="%" />
              </div>
              <div className={styles.k}>3rd-Party verifiziert</div>
            </div>
          </div>
        </div>

        <div className={styles.stage} ref={stageRef}>
          <div className={styles.glow} />
          <div className={styles.ring} />
          <div className={styles.vialWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element -- einzelnes dekoratives WebP-Frame */}
            <img src="/ueber-uns/vial-assembly/frame_120.webp" alt="ChromePeps Forschungspeptid-Vial" />
          </div>
          <span className={styles.lotTag}>
            <b>LOT</b> {data.lotNumber} ·{" "}
            <span className={styles.pass}>HPLC {data.purityComma} %</span>
          </span>
        </div>
      </div>

      <div className={styles.cue}>
        Scroll
        <i />
      </div>
    </section>
  );
}
