"use client";

import { useEffect } from "react";

/**
 * Globaler IntersectionObserver für alle `.reveal-up`-Elemente auf der
 * Seite. Wird einmal pro Page-Render gemountet, statt pro FadeUp-
 * Instance (vorher: 16+ IOs pro Homepage).
 *
 * - Above-the-fold-Elemente: sofort `.in` setzen, kein Wait auf Scroll
 *   (sonst flackern Hero-Headlines wenn der User den Tab vor dem Mount
 *   öffnet aber nicht scrollt).
 * - Below-the-fold-Elemente: bei 10 % Sichtbarkeit `.in` togglen, dann
 *   un-observen — wir wollen NICHT bei Hochscrollen rückwärts faden.
 * - Reduced-Motion: alle `.in` gleichzeitig setzen, keine Animation,
 *   keine IO-Arbeit.
 */
export function RevealController() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(".reveal-up");
    if (nodes.length === 0) return;

    // Reduced-Motion-User: alle direkt einblenden, keine Animation.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      nodes.forEach((n) => n.classList.add("in"));
      return;
    }

    // Above-the-fold sofort triggern (kein Sichtbarkeits-Warten).
    const vh = window.innerHeight;
    const pending: HTMLElement[] = [];
    nodes.forEach((n) => {
      const rect = n.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        n.classList.add("in");
      } else {
        pending.push(n);
      }
    });

    if (pending.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1 },
    );
    pending.forEach((n) => io.observe(n));

    return () => io.disconnect();
  }, []);

  return null;
}
