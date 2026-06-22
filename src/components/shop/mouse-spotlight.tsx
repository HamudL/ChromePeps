"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Soft gold radial gradient that follows the cursor across the whole viewport.
 *
 * Sits fixed behind all shop-layout content (z-0; header is z-40) and is
 * entirely inert (pointer-events: none, aria-hidden). Disabled on touch
 * devices, under prefers-reduced-motion, and below 1024 px — since a mouse
 * spotlight without a mouse makes no sense.
 *
 * Writes directly to the element's inline style via rAF-throttled pointer
 * events, so there is no React re-render on mouse move.
 */
export function MouseSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasHover = window.matchMedia("(hover: hover)").matches;
    const bigEnough = window.matchMedia("(min-width: 1024px)").matches;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (hasHover && bigEnough && !reducedMotion) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let pendingFrame = 0;
    const onMove = (e: PointerEvent) => {
      if (pendingFrame) return;
      const { clientX, clientY } = e;
      pendingFrame = requestAnimationFrame(() => {
        el.style.background = `radial-gradient(720px circle at ${clientX}px ${clientY}px, hsl(45 92% 55% / 0.09), transparent 55%)`;
        pendingFrame = 0;
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
