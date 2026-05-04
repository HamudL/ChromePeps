"use client";

import { useEffect, useRef } from "react";

/**
 * Unsichtbarer View-Tracker für Wissen-Artikel. Wird auf
 * /wissen/[slug] mit dem Slug des aktuellen Posts gemountet und
 * schickt EINMAL pro Mount einen POST an /api/wissen/posts/[slug]/view.
 *
 * Anti-Bot: der Endpoint selbst rate-limited (1 View/IP/Slug/Tag),
 * dieser Tracker verlässt sich darauf — kein doppelter Schutz im
 * Client. Mehrfach-Mount in einer Session (z.B. durch Hot-Reload)
 * ist via `hasFiredRef` abgesichert.
 *
 * Failsafe: wenn der POST failed (Netzwerk weg, Endpoint down),
 * wird das stillschweigend ignoriert. Views sind nice-to-have, kein
 * kritisches Tracking. Kein User-facing Error.
 *
 * AUDIT_REPORT_v3 §3.4.
 */

interface Props {
  slug: string;
}

export function BlogPostViewTracker({ slug }: Props) {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    // Verzögerung damit Bots die nur HTML scrapen (kein JS-Render)
    // nicht mitzählen — und damit echte User mindestens 1.5s auf der
    // Seite waren bevor der View zählt. Verhindert "Tab gleich wieder
    // zugemacht"-False-Positives.
    const timer = setTimeout(() => {
      void fetch(`/api/wissen/posts/${encodeURIComponent(slug)}/view`, {
        method: "POST",
        keepalive: true,
      }).catch(() => {
        // silent fail — Views sind nice-to-have, kein hard failure.
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [slug]);

  return null;
}
