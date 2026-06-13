"use client";

/**
 * Live Metrics — Readout-Band im Protokoll-Stil: links der Kicker mit
 * Einordnung, rechts die Messwerte als Readouts mit Haarlinien-Trennern.
 * Sitzt als schmales Band direkt unter dem Hero.
 *
 * `metrics` ist bewusst ein Pflicht-Prop OHNE Default: hier standen früher
 * erfundene DEFAULTS (247 Chargen, 99,12 %, 12.480 Bestellungen), die bei
 * leerer DB als echte Messwerte gerendert wurden. Die Zahlen kommen
 * ausschließlich vom Server (Homepage: COA-Aggregate aus Prisma); ohne
 * echte Werte rendert die Komponente nichts.
 */

import { useEffect, useRef, useState } from "react";

interface Metric {
  target: number;
  suffix?: string;
  decimals?: number;
  label: string;
  sub?: string;
}

interface LiveMetricsProps {
  metrics: Metric[];
}

export function LiveMetrics({ metrics }: LiveMetricsProps) {
  // Keine fabrizierten Zahlen: ohne echte Werte verschwindet die Section
  // komplett (die Homepage rendert sie ohnehin nur bei vorhandenen Tiles).
  if (metrics.length === 0) return null;
  return (
    <section
      className="border-y border-border bg-background"
      aria-label="Kennzahlen aus dem Labor"
    >
      <div className="container py-12 md:py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="max-w-xs">
            <span className="eyebrow">Live aus dem Labor</span>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Aggregiert aus allen veröffentlichten Analysezertifikaten —
              keine Schätzwerte.
            </p>
          </div>

          {/* Readouts in einer Protokoll-Zeile, getrennt durch Haarlinien
              (Mobile: gestapelt mit horizontalen Linien). */}
          <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
            {metrics.map((m, i) => (
              <div
                key={m.label}
                className="py-6 first:pt-0 last:pb-0 sm:px-10 sm:py-0 sm:first:pl-0 sm:last:pr-0"
              >
                <MetricTile metric={m} delay={i * 120} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricTile({ metric, delay }: { metric: Metric; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Initial-State ist der finale Target-Wert — damit SSR und der erste
  // Client-Render direkt die echte Zahl zeigen. Wenn die Section beim
  // Mount UNTER dem Viewport liegt (User muss noch scrollen), starten
  // wir die Count-up-Animation; sonst bleibt der Wert direkt sichtbar.
  // Vorher initialisierte useState(0), wodurch SSR + initial Hydration
  // "0" rendert — wenn der User die Section nicht scrollt (z.B. bleibt
  // im Hero-Bereich), bleibt's bei "0" sichtbar. Result: "0 Chargen"
  // auf der Homepage trotz korrekter DB- und Cache-Werte.
  const [value, setValue] = useState(metric.target);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasRun.current) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      // Bei Reduced-Motion gar keine Animation — target bleibt sichtbar.
      hasRun.current = true;
      return;
    }

    // Section bereits im oder oberhalb des Viewports? Dann keine
    // Count-up-Animation mehr — der User sieht den Wert ohnehin direkt
    // und ein nachträgliches "0 → target"-Reset würde flackern.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      hasRun.current = true;
      return;
    }

    // Section ist unter dem Viewport — Count-up vorbereiten und auf
    // Intersection warten.
    setValue(0);

    const run = () => {
      hasRun.current = true;
      const duration = 1600;
      const start = performance.now() + delay;
      const tick = (now: number) => {
        if (now < start) {
          requestAnimationFrame(tick);
          return;
        }
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(metric.target * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            run();
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [metric.target, delay]);

  const formatted = (() => {
    const decimals = metric.decimals ?? 0;
    const n = value.toFixed(decimals);
    if (decimals === 0 && metric.target >= 1000) {
      return Number(n).toLocaleString("de-DE");
    }
    return n.replace(".", ",");
  })();

  return (
    <div ref={ref}>
      <div className="flex items-baseline">
        <span className="stat-value text-4xl md:text-5xl">{formatted}</span>
        {metric.suffix && (
          <span className="ml-1 text-xl font-semibold text-primary-strong md:text-2xl">
            {metric.suffix}
          </span>
        )}
      </div>
      <p className="stat-key mt-3">{metric.label}</p>
      {metric.sub && (
        <p className="mt-1.5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground/70">
          {metric.sub}
        </p>
      )}
    </div>
  );
}
