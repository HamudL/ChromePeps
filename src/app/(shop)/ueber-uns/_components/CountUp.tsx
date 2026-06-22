"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Count-up-Zahl, die bei In-View hochzählt (ersetzt die frühere
 * [data-count]-querySelector-Logik aus interactions.tsx).
 *
 * - `value === null` → statischer Fallback-Text ("n. v."), kein Zählen
 *   (z. B. wenn die DB-Query für avgPurity/chargenCount fehlschlug).
 * - Respektiert `prefers-reduced-motion`: zeigt sofort den Endwert.
 * - Formatierung de-DE mit fester Nachkomma-Stellenzahl (tabular-nums via CSS).
 */
export function CountUp({
  value,
  decimals = 0,
  suffix,
  fallback = "n. v.",
  durationMs = 1600,
}: {
  value: number | null;
  decimals?: number;
  suffix?: string;
  fallback?: string;
  durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value === null ? fallback : "0");

  useEffect(() => {
    if (value === null) {
      setDisplay(fallback);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const fmt = (v: number) =>
      v.toLocaleString("de-DE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      setDisplay(fmt(value));
      return;
    }

    let raf = 0;
    let started = false;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(fmt(value * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
        else setDisplay(fmt(value));
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            started = true;
            run();
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, decimals, fallback, durationMs]);

  return (
    <span ref={ref}>
      {display}
      {suffix ? <small>{suffix}</small> : null}
    </span>
  );
}
