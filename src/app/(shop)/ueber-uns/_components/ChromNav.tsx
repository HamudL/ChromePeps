"use client";

import { useEffect, useRef, useState } from "react";
import { NAV_SECTIONS, NAV_HEIGHTS } from "./data";
import styles from "./ChromNav.module.css";

const W = 1000;
const BASE = 50;
const gauss = (x: number, mu: number, sigma: number, amp: number) =>
  amp * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));

/**
 * Chromatogramm-Sub-Navigation: Inhalt als HPLC-Trace. Sticky unter dem
 * Site-Header (64px). Der jitter-behaftete Trace-Pfad wird CLIENT-seitig
 * gebaut (Math.random → kein SSR/Client-Hydration-Mismatch); Playhead +
 * Retention-Time + aktiver Peak folgen der Scroll-Position.
 */
export function ChromNav() {
  const traceRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const playheadRef = useRef<SVGLineElement>(null);
  const timeRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  // Trace einmalig client-seitig bauen.
  useEffect(() => {
    const pts: Array<[number, number]> = [];
    for (let x = 0; x <= W; x += 2) {
      let y = BASE;
      NAV_SECTIONS.forEach((s, i) => {
        y -= gauss(x, s.peakX, 11, NAV_HEIGHTS[i]);
      });
      y += Math.sin(x * 0.13) * 0.25 + (Math.random() - 0.5) * 0.35;
      pts.push([x, y]);
    }
    let d = `M ${pts[0][0]} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1].toFixed(2)}`;
    traceRef.current?.setAttribute("d", d);
    fillRef.current?.setAttribute("d", `${d} L ${W} ${BASE} L 0 ${BASE} Z`);
  }, []);

  // Playhead + Retention-Time + aktiver Peak an Scroll koppeln.
  useEffect(() => {
    const els = NAV_SECTIONS.map((s) => document.getElementById(s.id));
    let pending = false;
    let lastActive = -1;

    const update = () => {
      const vh = window.innerHeight;
      const scrollY = window.scrollY;
      const docMax = Math.max(1, document.documentElement.scrollHeight - vh);
      // Referenzlinie knapp unter Header (64) + Sub-Nav (56): die Sektion,
      // deren Oberkante diese Linie passiert hat, ist "aktiv".
      const ref = scrollY + 130;
      const tops = els.map((el) => (el ? el.getBoundingClientRect().top + scrollY : 0));

      let i = 0;
      for (let k = 0; k < tops.length; k++) if (tops[k] <= ref) i = k;

      // Fortschritt INNERHALB der aktuellen Sektion → Playhead zwischen den
      // beiden Peak-x interpolieren, damit "wo du bist" = "wo der Playhead ist".
      const segStart = tops[i];
      const segEnd = i < tops.length - 1 ? tops[i + 1] : docMax + vh;
      const f =
        segEnd > segStart
          ? Math.min(1, Math.max(0, (ref - segStart) / (segEnd - segStart)))
          : 0;
      const xStart = NAV_SECTIONS[i].peakX;
      const xEnd = i < NAV_SECTIONS.length - 1 ? NAV_SECTIONS[i + 1].peakX : W;
      const x = xStart + (xEnd - xStart) * f;

      const ph = playheadRef.current;
      if (ph) {
        ph.setAttribute("x1", String(x));
        ph.setAttribute("x2", String(x));
      }
      if (timeRef.current) {
        const tm = (x / W) * 10;
        const m = Math.floor(tm);
        const s = Math.floor((tm - m) * 60);
        timeRef.current.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
      if (i !== lastActive) {
        lastActive = i;
        setActive(i);
      }
    };

    const onScroll = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        update();
        pending = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className={styles.nav} data-chromnav aria-label="Inhalt als HPLC-Chromatogramm">
      <div className={styles.inner}>
        <div className={styles.label}>
          <span className={styles.liveDot} />
          <span>RP-HPLC · 220 nm</span>
        </div>
        <div className={styles.svgWrap}>
          <svg
            className={styles.svg}
            viewBox="0 0 1000 56"
            preserveAspectRatio="none"
          >
            <g className={styles.grid}>
              <line x1="0" x2="1000" y1="14" y2="14" />
              <line x1="0" x2="1000" y1="28" y2="28" />
              <line x1="0" x2="1000" y1="42" y2="42" />
            </g>
            <line className={styles.baseline} x1="0" x2="1000" y1="50" y2="50" />
            <path ref={fillRef} className={styles.traceFill} d="" />
            <path ref={traceRef} className={styles.trace} d="" />
            <g>
              {NAV_SECTIONS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`${styles.peakLink} ${i === active ? styles.peakHot : ""}`}
                >
                  <rect x={s.peakX - 24} y="0" width="48" height="56" fill="transparent" />
                  <line
                    className={styles.peakTick}
                    x1={s.peakX}
                    x2={s.peakX}
                    y1="50"
                    y2="54"
                  />
                  <circle cx={s.peakX} cy={BASE - NAV_HEIGHTS[i]} r="1.6" fill="currentColor" />
                  <text className={styles.peakLabel} x={s.peakX} y="10" textAnchor="middle">
                    {s.label}
                  </text>
                </a>
              ))}
            </g>
            <line ref={playheadRef} className={styles.playhead} x1="0" x2="0" y1="0" y2="56" />
          </svg>
        </div>
        <div className={styles.right}>
          <b ref={timeRef}>00:00</b>
          <span>min</span>
        </div>
      </div>
    </div>
  );
}
