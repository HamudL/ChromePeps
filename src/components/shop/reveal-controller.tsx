"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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
 * - Reduced-Motion: alle `.in` gleichzeitig setzen, keine Animation.
 *
 * WICHTIG (Bugfix): `.reveal-up`-Elemente, die ERST NACH dem initialen
 * Scan in den DOM kommen, müssen ebenfalls erfasst werden — sonst bleiben
 * sie dauerhaft auf `opacity:0` (Symptom: nach Klick/Navigation/Nachladen
 * wird „nur der Hintergrund" angezeigt, der Inhalt ist unsichtbar). Solche
 * spät hinzugefügten Elemente entstehen durch:
 *   - gestreamte / Suspense-Inhalte nach client-seitiger Navigation,
 *   - Client-Components, die nach Mount rendern (z.B. Lazy-Load weiterer
 *     Reviews via /api/reviews, RecentlyViewed),
 *   - conditionally eingeblendete Sektionen (Tabs, „mehr anzeigen").
 * Deshalb läuft zusätzlich zum Scan ein MutationObserver, der neue
 * `.reveal-up`-Knoten nachzieht. (PR #63 fixte nur den Re-Scan pro
 * Routenwechsel — das deckte spät gerenderte Elemente nicht ab.)
 */
export function RevealController() {
  // Bei JEDEM Routenwechsel neu aufsetzen: Das (shop)-Layout (und damit
  // dieser Controller) bleibt bei client-seitiger Navigation gemountet.
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Below-the-fold-Reveal-on-Scroll. Bei Reduced-Motion gar nicht erst
    // anlegen — dann wird unten alles sofort eingeblendet.
    const io = reduced
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                entry.target.classList.add("in");
                io?.unobserve(entry.target);
              }
            }
          },
          { threshold: 0.1 },
        );

    // Reveal-Entscheidung für EIN Element. Idempotent (bereits sichtbare
    // werden übersprungen), damit Scan + MutationObserver sich nicht in die
    // Quere kommen.
    const reveal = (node: HTMLElement) => {
      if (node.classList.contains("in")) return;
      if (reduced || !io) {
        node.classList.add("in");
        return;
      }
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        node.classList.add("in"); // above-the-fold → sofort
      } else {
        io.observe(node); // below-the-fold → bei Sichtbarkeit
      }
    };

    // 1) Initialer Scan der bereits vorhandenen Elemente.
    document
      .querySelectorAll<HTMLElement>(".reveal-up")
      .forEach((n) => reveal(n));

    // 2) Nachzügler: Elemente, die später in den DOM kommen, erfassen.
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((added) => {
          if (!(added instanceof HTMLElement)) return;
          if (added.classList.contains("reveal-up")) reveal(added);
          added
            .querySelectorAll<HTMLElement>(".reveal-up")
            .forEach((n) => reveal(n));
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io?.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
