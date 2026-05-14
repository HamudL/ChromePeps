"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Product3DTilt } from "@/components/shop/product-3d-tilt";

/**
 * Product3DVialLazy — Lazy-Wrapper für das echte 3D-Vial-Modell.
 *
 * Three.js + react-three-fiber sind ~180 KB gzipped. Auf dem ersten
 * Page-Load (Produkt-Detail) wollen wir das nicht synchron mitladen,
 * sondern erst nach LCP via `dynamic({ ssr: false })`.
 *
 * Fallback bei laufendem Import: das 2D-Tilt-Bild aus Product3DTilt
 * — gleiche Aspect-Ratio, kein Layout-Jump.
 *
 * Skip-Bedingungen (zeigt komplett das 2D-Tilt-Bild ohne 3D zu laden):
 *   - `prefers-reduced-motion: reduce` (a11y)
 *   - Touch-Only-Devices (`(hover: none)`) — drehen via Touch ist
 *     möglich, aber das auto-rotate vom 3D-Modell auf einem kleinen
 *     Touchscreen ist ablenkend, und Three.js ~180 KB lohnt nicht
 *     für ein winziges Mobile-Bild
 *
 * AUDIT_REPORT_v3 §6.
 */

const Product3DVial = dynamic(
  () =>
    import("@/components/shop/product-3d-vial").then((m) => ({
      default: m.Product3DVial,
    })),
  {
    ssr: false,
    loading: () => null,
  },
);

interface Props {
  productName: string;
  /** Fallback-Bild wenn 3D nicht geladen/möglich ist. */
  fallbackSrc: string;
  fallbackAlt: string;
}

export function Product3DVialLazy({
  productName,
  fallbackSrc,
  fallbackAlt,
}: Props) {
  const [enable3D, setEnable3D] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const hoverCapable = window.matchMedia("(hover: hover)").matches;
    if (reducedMotion || !hoverCapable) {
      setEnable3D(false);
      return;
    }
    // Erst nach Idle aktivieren — gibt LCP/INP Atemraum und der User
    // sieht das 2D-Foto sofort, bekommt das 3D-Modell nachgereicht.
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setEnable3D(true), {
        timeout: 1500,
      });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(() => setEnable3D(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!enable3D) {
    // 2D-Tilt-Fallback bleibt sichtbar während 3D nachgereicht wird
    return (
      <Product3DTilt
        src={fallbackSrc}
        alt={fallbackAlt}
        fit="contain"
        priority
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <Product3DVial productName={productName} />
    </div>
  );
}
