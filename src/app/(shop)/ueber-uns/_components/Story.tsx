"use client";

import { useEffect, useRef } from "react";
import { STORY_PANELS } from "./data";
import shared from "./shared.module.css";
import styles from "./Story.module.css";

const FRAMES = 120;
const URLS = Array.from(
  { length: FRAMES },
  (_, i) => `/ueber-uns/vial-assembly/frame_${String(i + 1).padStart(3, "0")}.webp`,
);

/**
 * Story-Sektion: Sticky-Stage scrubbt scroll-synchron unsere 120-Frame-
 * Cycles-Assembly (rAF-Lerp glättet Sprünge, decode()-Preload macht
 * src-Swaps <5 ms). 4 Panels schalten Index/Annotationen/Scan/Bar.
 */
export function Story({
  lotNumber,
  purityComma,
}: {
  // null = keine veröffentlichte COA in der DB. Die Annotationen zeigen
  // dann prozess-ehrliche Texte ohne erfundene Messwerte; die 4er-
  // Annotation-Struktur bleibt erhalten (Scroll-Scrub zählt Indizes).
  lotNumber: string | null;
  purityComma: string | null;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const vialRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const vial = vialRef.current;
    if (!section || !vial) return;

    const scan = section.querySelector<HTMLElement>("[data-scan]");
    const idx = section.querySelector<HTMLElement>("[data-idx]");
    const bar = section.querySelector<HTMLElement>("[data-bar]");
    const annots = Array.from(section.querySelectorAll<HTMLElement>("[data-show]"));

    // Der Frame-Scrub (120 WebP ≈ 5 MB) ist ein reines Desktop-Feature. Auf
    // Mobile ODER bei prefers-reduced-motion wird weder vorgeladen noch die
    // Sequenz gescrubbt — es bleibt beim statisch gerenderten frame_001.
    // (Konvention der Schwester-Komponenten, die alle Reduced-Motion gaten.)
    const enableScrub =
      window.matchMedia("(min-width: 768px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cancelled = false;
    const timers: number[] = [];
    let idleHandle: number | null = null;

    // Frames gestaffelt vorladen (decode) — in kleinen Wellen statt in einem
    // 120er-Burst, damit die Verbindung nicht blockiert wird. Startet, sobald
    // der Browser idle ist.
    const preload = () => {
      const WAVE = 12;
      let i = 0;
      const loadWave = () => {
        if (cancelled) return;
        const end = Math.min(i + WAVE, URLS.length);
        for (; i < end; i++) {
          const img = new Image();
          img.src = URLS[i];
          img.decode?.().catch(() => {});
        }
        if (i < URLS.length) timers.push(window.setTimeout(loadWave, 60));
      };
      loadWave();
    };
    if (enableScrub) {
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(preload, { timeout: 2000 });
      } else {
        timers.push(window.setTimeout(preload, 100));
      }
    }

    let current = -1;
    let target = 0;
    let displayed = 0;
    let lerpRaf: number | null = null;

    const lerpTick = () => {
      const diff = target - displayed;
      if (Math.abs(diff) < 0.5) {
        displayed = target;
        lerpRaf = null;
      } else {
        displayed += diff * 0.25;
        lerpRaf = requestAnimationFrame(lerpTick);
      }
      const intIdx = Math.max(0, Math.min(FRAMES - 1, Math.round(displayed)));
      if (intIdx !== current) {
        current = intIdx;
        vial.src = URLS[intIdx];
      }
    };

    let pending = false;
    const update = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height + vh;
      const scrolled = vh - rect.top;
      const t = Math.min(1, Math.max(0, scrolled / total));

      const active = Math.min(3, Math.floor(t * 4 * 0.999));
      annots.forEach((a) => {
        const want = parseInt(a.dataset.show || "0", 10);
        a.classList.toggle(styles.show, active + 1 === want);
      });
      if (idx) idx.textContent = `${String(active + 1).padStart(2, "0")} / 04`;
      if (bar) bar.style.width = `${(t * 100).toFixed(1)}%`;
      if (scan) scan.style.setProperty("--t", t.toFixed(3));

      // Frame-Sequenz nur auf Desktop ohne Reduced-Motion scrubben; sonst
      // bleibt das statische frame_001 stehen (kein src-Swap, keine 120
      // ungecachten Requests beim Scrollen).
      if (enableScrub) {
        target = Math.min(FRAMES - 1, Math.floor(t * FRAMES));
        if (lerpRaf === null) lerpRaf = requestAnimationFrame(lerpTick);
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
      cancelled = true;
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      }
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (lerpRaf !== null) cancelAnimationFrame(lerpRaf);
    };
  }, []);

  return (
    <section className={styles.story} id="story" ref={sectionRef}>
      <div className={shared.container}>
        <div className={`reveal-up ${styles.heading}`}>
          <div className={`mono-label ${shared.gold} ${shared.center}`}>
            <span className={shared.dot} />
            02 · VIAL → CHARGE
          </div>
          <h2>
            Was passiert, bevor das Etikett{" "}
            <span className={shared.accent}>freigegeben</span> wird.
          </h2>
          <p>
            Vier Schritte vom Rohstoff bis zur versendeten Charge. Scrollen Sie
            weiter, das Vial dreht sich mit.
          </p>
        </div>

        <div className={styles.inner}>
          <div className={styles.stageWrap}>
            <div className={styles.stage}>
              <div className={styles.gridbg} />
              <div className={styles.holder}>
                {/* eslint-disable-next-line @next/next/no-img-element -- scroll-gescrubbte Frame-Sequenz; next/image kann rapide src-Swaps nicht */}
                <img ref={vialRef} src="/ueber-uns/vial-assembly/frame_001.webp" alt="" />
              </div>
              <span className={styles.scan} data-scan />

              <span className={`${styles.annot} ${styles.left} ${styles.a1}`} data-show="1">
                <span className={styles.ln} />
                <span>
                  <b>STERIL</b> · NEUTRAL VERPACKT
                </span>
              </span>
              <span className={`${styles.annot} ${styles.right} ${styles.a2}`} data-show="2">
                <span className={styles.ln} />
                <span>
                  {purityComma ? (
                    <>
                      <b>HPLC {purityComma} %</b> · Janoshik
                    </>
                  ) : (
                    <>
                      <b>HPLC-geprüft</b> · Janoshik
                    </>
                  )}
                </span>
              </span>
              <span className={`${styles.annot} ${styles.left} ${styles.a3}`} data-show="3">
                <span className={styles.ln} />
                <span>
                  {lotNumber ? (
                    <>
                      <b>{lotNumber}</b> · −24 °C
                    </>
                  ) : (
                    <>
                      <b>−24 °C</b> · Tiefkühl-Lagerung
                    </>
                  )}
                </span>
              </span>
              <span className={`${styles.annot} ${styles.right} ${styles.a4}`} data-show="4">
                <span className={styles.ln} />
                <span>
                  <b>RUO</b> · Research Use Only
                </span>
              </span>

              <div className={styles.progress}>
                <span data-idx>01 / 04</span>
                <span className={styles.bar}>
                  <i data-bar />
                </span>
                <span>04</span>
              </div>
            </div>
          </div>

          <div className={styles.panels}>
            {STORY_PANELS.map((panel, pi) => (
              <article className={`reveal-up ${styles.panel}`} key={pi} data-panel>
                <div className={`mono-label ${shared.gold}`}>{panel.label}</div>
                <h3>
                  {panel.title.map((seg, i) =>
                    seg.accent ? (
                      <span className={shared.accent} key={i}>
                        {seg.text}
                      </span>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    ),
                  )}
                </h3>
                <p>
                  {panel.body.map((seg, i) =>
                    seg.bold ? <b key={i}>{seg.text}</b> : <span key={i}>{seg.text}</span>,
                  )}
                </p>
                <dl>
                  {panel.facts.map((f) => (
                    <div key={f.dt}>
                      <dt>{f.dt}</dt>
                      {/* Ohne echte COA keinen Lot-Wert erfinden — "—". */}
                      <dd>{f.lot ? lotNumber ?? "—" : f.dd}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
