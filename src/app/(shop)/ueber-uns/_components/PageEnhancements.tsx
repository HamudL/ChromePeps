"use client";

import { useEffect } from "react";

/**
 * Smooth-Scroll für seiteninterne Anker (Hero-CTAs, Chromatogramm-Sub-Nav,
 * Labor → Kontakt). Delegierter Click-Listener, gescoped auf den
 * [data-ueber-uns]-Wrapper. Offset = Site-Header (64px) + Sub-Nav-Höhe + 8.
 * Respektiert prefers-reduced-motion (springt dann ohne Animation).
 */
export function PageEnhancements() {
  useEffect(() => {
    const root = document.querySelector("[data-ueber-uns]");
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.("a[href^='#']");
      if (!anchor || !root.contains(anchor)) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      e.preventDefault();
      const chrom = document.querySelector<HTMLElement>("[data-chromnav]");
      const offset = 64 + (chrom ? chrom.offsetHeight : 0) + 8;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
