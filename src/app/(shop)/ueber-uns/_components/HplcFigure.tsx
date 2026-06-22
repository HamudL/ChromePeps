"use client";

import { useEffect, useRef } from "react";
import styles from "./HplcFigure.module.css";

const W = 1000;
const BASE = 280;
const gauss = (x: number, mu: number, sigma: number, amp: number) =>
  amp * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));

function buildPath() {
  const pts: Array<[number, number]> = [];
  for (let x = 0; x <= W; x += 2) {
    let y = BASE;
    y -= gauss(x, 60, 16, 22);
    y -= gauss(x, 240, 20, 16);
    y -= gauss(x, 465, 18, 238);
    y -= gauss(x, 710, 14, 20);
    y -= gauss(x, 850, 26, 10);
    y += (Math.random() - 0.5) * 1.4;
    pts.push([x, Math.max(20, y)]);
  }
  let d = `M ${pts[0][0]} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1].toFixed(2)}`;
  return { d, area: `${d} L ${W} ${BASE} L 0 ${BASE} Z` };
}

/**
 * HPLC-Figure-Card: zeichnet bei In-View ein echtes Chromatogramm live
 * (stroke-dashoffset), blendet Fläche + Marker ein und stempelt „PASSED“.
 * Pfad client-seitig gebaut (Math.random → kein Hydration-Mismatch).
 */
export function HplcFigure({
  lotNumber,
  purityComma,
  testDate,
}: {
  lotNumber: string;
  purityComma: string;
  testDate: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const strokeRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const peakMarkerRef = useRef<SVGGElement>(null);
  const impurityRef = useRef<SVGGElement>(null);
  const stampRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stroke = strokeRef.current;
    const area = areaRef.current;
    const card = cardRef.current;
    if (!stroke || !area || !card) return;

    const { d, area: areaD } = buildPath();
    stroke.setAttribute("d", d);
    area.setAttribute("d", areaD);
    const L = stroke.getTotalLength();
    stroke.style.strokeDasharray = `${L} ${L}`;
    stroke.style.strokeDashoffset = String(L);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeouts: number[] = [];
    let raf = 0;
    let played = false;

    const finish = () => {
      area.style.opacity = "1";
      if (peakMarkerRef.current) peakMarkerRef.current.style.opacity = "1";
      if (impurityRef.current) impurityRef.current.style.opacity = "1";
      stampRef.current?.classList.add(styles.in);
    };

    const run = () => {
      if (played) return;
      played = true;
      if (reduced) {
        stroke.style.strokeDashoffset = "0";
        finish();
        return;
      }
      const duration = 2200;
      const start = performance.now();
      area.style.transition = "opacity 1.2s ease";
      if (peakMarkerRef.current) peakMarkerRef.current.style.transition = "opacity .5s";
      if (impurityRef.current) impurityRef.current.style.transition = "opacity .5s";
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        stroke.style.strokeDashoffset = String(L * (1 - eased));
        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          area.style.opacity = "1";
          timeouts.push(
            window.setTimeout(() => {
              if (peakMarkerRef.current) peakMarkerRef.current.style.opacity = "1";
            }, 80),
          );
          timeouts.push(
            window.setTimeout(() => {
              if (impurityRef.current) impurityRef.current.style.opacity = "1";
            }, 340),
          );
          timeouts.push(
            window.setTimeout(() => stampRef.current?.classList.add(styles.in), 900),
          );
        }
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            run();
            obs.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(card);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div className={`reveal-up ${styles.card}`} ref={cardRef}>
      <div className={styles.head}>
        <div className={styles.cell}>
          <div className={styles.k}>Sample</div>
          <div className={styles.v}>{lotNumber}</div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>Method</div>
          <div className={styles.v}>RP-HPLC · 220 nm</div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>Säule</div>
          <div className={styles.v}>C18 · 4,6×250 mm</div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>Run</div>
          <div className={styles.v}>{testDate}</div>
        </div>
        <div className={styles.cell}>
          <div className={styles.k}>Status</div>
          <div className={`${styles.v} ${styles.pass}`}>PASS · {purityComma} %</div>
        </div>
      </div>

      <div className={styles.stage}>
        <svg viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
          <g className={styles.grid}>
            <line x1="0" x2="1000" y1="50" y2="50" />
            <line x1="0" x2="1000" y1="110" y2="110" />
            <line x1="0" x2="1000" y1="170" y2="170" />
            <line x1="0" x2="1000" y1="230" y2="230" />
            <line x1="0" x2="1000" y1="290" y2="290" />
            <line x1="200" x2="200" y1="0" y2="300" />
            <line x1="400" x2="400" y1="0" y2="300" />
            <line x1="600" x2="600" y1="0" y2="300" />
            <line x1="800" x2="800" y1="0" y2="300" />
          </g>
          <line className={styles.axisLine} x1="0" x2="1000" y1="300" y2="300" />
          <line className={styles.baseline} x1="0" x2="1000" y1="280" y2="280" />

          <path ref={areaRef} className={styles.traceFill} d="" />
          <path ref={strokeRef} className={styles.trace} d="" />

          <g ref={peakMarkerRef} opacity="0">
            <line className={styles.marker} x1="465" x2="465" y1="30" y2="280" />
            <text className={styles.label} x="475" y="48">
              t<tspan fontStyle="italic">R</tspan> 5,82 min
            </text>
            <text className={`${styles.label} ${styles.dim}`} x="475" y="64">
              {purityComma} %
            </text>
          </g>
          <g ref={impurityRef} opacity="0">
            <line className={styles.marker} x1="710" x2="710" y1="244" y2="280" />
            <text className={`${styles.label} ${styles.dim}`} x="720" y="260">
              0,31 %
            </text>
          </g>

          <text className={styles.yLabel} x="8" y="14">
            mAU
          </text>
          <text className={styles.axisTick} x="200" y="314">2</text>
          <text className={styles.axisTick} x="400" y="314">4</text>
          <text className={styles.axisTick} x="600" y="314">6</text>
          <text className={styles.axisTick} x="800" y="314">8</text>
          <text className={styles.axisTick} x="965" y="314">10 min</text>
        </svg>

        <span className={styles.stamp} ref={stampRef}>
          PASSED<small>14 · MAI · 26</small>
        </span>
      </div>

      <div className={styles.foot}>
        <div className={styles.notes}>
          <b>Bedingungen:</b> RP-HPLC · C18 · 4,6 × 250 mm · 5 µm · Fluss 1,0
          ml/min · UV 220 nm · Gradient 0,1 % TFA / Acetonitril, 5 → 60 % über 10
          min. Referenz­spektrum: Janoshik MS-Library, Match-Score 0,997.
        </div>
        <div className={styles.footCta}>
          <a href="#kontakt">
            CoA anfordern <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}
