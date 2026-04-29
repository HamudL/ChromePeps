"use client";

/**
 * Idea 08 — Live Metrics with count-up animation
 *
 * Drop this between the Trust Bar and "Warum ChromePeps?" on the homepage.
 * Light-mode section — matches the existing container rhythm between the
 * dark trust bar and the dark "Warum" block.
 *
 * The server component fetching the numbers (Prisma queries for COA count,
 * avg purity over the last 12 months, delivered orders) passes them in as
 * props. Defaults shown here are placeholders for isolated stories/tests.
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
  metrics?: Metric[];
}

const DEFAULTS: Metric[] = [
  {
    target: 247,
    label: "Chargen · getestet",
    sub: "Stand April 2026",
  },
  {
    target: 99.12,
    suffix: "%",
    decimals: 2,
    label: "Ø Reinheit · 12 Monate",
    sub: "HPLC · Janoshik Labs",
  },
  {
    target: 12_480,
    label: "Ausgelieferte Bestellungen",
    sub: "seit 2023",
  },
];

export function LiveMetrics({ metrics = DEFAULTS }: LiveMetricsProps) {
  if (metrics.length === 0) return null;
  return (
    <section className="border-y bg-background">
      <div className="container py-14 md:py-16">
        {/* Flex-Layout statt fixes 3-col-Grid: bei 1 oder 2 Tiles sitzen
            sie nicht mehr linksbündig in einer unsichtbaren dritten
            Spalte, sondern werden immer zentriert dargestellt. */}
        <div className="flex flex-col md:flex-row md:flex-wrap items-center justify-center gap-10 md:gap-16 mx-auto">
          {metrics.map((m, i) => (
            <div key={m.label} className="w-full md:w-auto md:min-w-[14rem] md:max-w-xs">
              <MetricTile metric={m} delay={i * 120} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricTile({ metric, delay }: { metric: Metric; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasRun.current) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const run = () => {
      hasRun.current = true;
      if (reduced) {
        setValue(metric.target);
        return;
      }
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
      { threshold: 0.4 }
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
    <div ref={ref} className="text-center">
      <div className="flex items-baseline justify-center">
        <span className="text-5xl md:text-6xl font-bold tracking-tight tabular-nums leading-none text-foreground">
          {formatted}
        </span>
        {metric.suffix && (
          <span className="text-primary text-2xl md:text-3xl font-semibold ml-1">
            {metric.suffix}
          </span>
        )}
      </div>
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground mt-3">
        {metric.label}
      </p>
      {metric.sub && (
        <p className="text-xs text-muted-foreground/70 mt-1.5">{metric.sub}</p>
      )}
    </div>
  );
}
