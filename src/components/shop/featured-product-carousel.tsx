"use client";

import { useEffect, useState } from "react";
import { FeaturedProductCard } from "./featured-product-card";
import type { FeaturedProductData } from "@/lib/products/featured";

interface Props {
  pool: FeaturedProductData[];
  /** Wechselintervall in ms. Default 20 s. */
  intervalMs?: number;
}

/**
 * Rotiert zwischen den Produkten im `pool` mit einer dezenten Cross-Fade-
 * Animation. Wechsel-Intervall default 20 s — lang genug damit der User
 * den aktuellen Eintrag wahrnehmen + scannen kann, aber kurz genug dass
 * die Sektion nicht statisch wirkt.
 *
 * Random-Pick aus dem Pool, kein Round-Robin: bei einem Pool-of-3 fühlt
 * sich Round-Robin schnell repetitiv an. Random plus "selben Eintrag
 * nicht zweimal hintereinander"-Guard liefert organischeres Gefühl,
 * ohne wahrnehmbar nervig zu werden.
 *
 * Animation: einfaches opacity-Toggle mit 500-ms-Transition. Während
 * des Fade-Out bleibt der alte Card-Inhalt sichtbar (mit reduzierter
 * Opacity), nach 500 ms switchen wir zum neuen Eintrag und faden ihn
 * ein. Kein Layout-Shift, weil der Wrapper selbst die feste Höhe hält.
 */
export function FeaturedProductCarousel({ pool, intervalMs = 20_000 }: Props) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (pool.length <= 1) return; // nichts zu rotieren

    const id = window.setInterval(() => {
      // Fade-Out → nach 500 ms neuer Index → Fade-In
      setVisible(false);
      window.setTimeout(() => {
        setIndex((prev) => {
          if (pool.length === 1) return 0;
          // Random, aber NICHT denselben Eintrag wie zuletzt.
          let next = Math.floor(Math.random() * pool.length);
          if (next === prev) next = (next + 1) % pool.length;
          return next;
        });
        setVisible(true);
      }, 500);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [pool.length, intervalMs]);

  if (pool.length === 0) return null;
  const current = pool[index] ?? pool[0];

  return (
    <div
      className="transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
      aria-live="polite"
    >
      <FeaturedProductCard product={current} />
    </div>
  );
}
