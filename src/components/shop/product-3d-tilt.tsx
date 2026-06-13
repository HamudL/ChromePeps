"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Product3DTilt — Pointer-reaktives 3D-Tilt für ein 2D-Produkt-Foto.
 *
 * Inspiration: Jitter-NFT-Card-Effect. KEIN echtes 3D-Modell, sondern
 * ein 2D-Bild in einem `perspective: 1200px`-Container, das per
 * `transform: rotateX() rotateY()` der Pointer-Position folgt.
 *
 * Layers:
 *  1. Container mit perspective (wird nicht selbst gedreht)
 *  2. Inner-Stage (transform-style: preserve-3d, transformiert per
 *     onPointerMove zu rotateX/Y)
 *  3. Image (next/image) füllt die Stage
 *  4. Highlight-Overlay (radial-gradient folgt der Maus, soft-light)
 *
 * a11y:
 *  - `prefers-reduced-motion: reduce` → kein Tilt, kein Highlight
 *  - Bild bleibt komplett zugänglich (alt-Text, fokussierbar)
 *  - draggable={false} damit Maus-Drag das Bild nicht ghosten lässt
 */

interface Props {
  src: string;
  alt: string;
  /** Wie stark sich das Bild verkippt — Grad in jede Richtung. */
  maxTilt?: number;
  /** object-fit. „contain" für freigestellte Vials, „cover" für Lifestyle. */
  fit?: "contain" | "cover";
  /** Sizes-Attribute für next/image. */
  sizes?: string;
  /** Priority-Loading (für LCP-Image im above-the-fold). */
  priority?: boolean;
}

export function Product3DTilt({
  src,
  alt,
  maxTilt = 14,
  fit = "contain",
  sizes = "(max-width: 1024px) 100vw, 50vw",
  priority = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, scale: 1 });
  const [highlight, setHighlight] = useState({ x: 50, y: 50, visible: false });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pressed, setPressed] = useState(false);

  // rAF-Throttle für pointermove: Pointer-Events feuern je nach Gerät
  // mit 120–1000 Hz — jedes löste vorher zwei setState (Tilt + Highlight)
  // und damit ein React-Re-Render aus, obwohl der Browser ohnehin nur
  // einmal pro Frame malt. Wir merken uns nur das LETZTE Event und
  // verarbeiten es genau einmal pro Frame.
  const rafIdRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ clientX: number; clientY: number } | null>(
    null
  );

  // Reduced-motion einmal beim Mount auslesen (matchMedia).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Pending Frame beim Unmount verwerfen — sonst feuert der Callback
  // setState auf eine bereits unmountete Komponente.
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion) return;
    // Nur die Koordinaten festhalten — Events nach dem ersten innerhalb
    // eines Frames überschreiben sie ("letztes Event gewinnt").
    lastPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (rafIdRef.current !== null) return; // Frame bereits geplant
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const point = lastPointerRef.current;
      if (!point) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (point.clientX - rect.left) / rect.width; // 0 (left) … 1 (right)
      const y = (point.clientY - rect.top) / rect.height; // 0 (top)  … 1 (bottom)
      // Y-Achse: rechts der Mitte → Bild zeigt Richtung uns rechts (rotateY positiv)
      const rotateY = (x - 0.5) * 2 * maxTilt;
      // X-Achse: oben der Mitte → Bild kippt nach hinten (rotateX positiv)
      const rotateX = (0.5 - y) * 2 * maxTilt;
      setTilt({
        x: rotateX,
        y: rotateY,
        scale: pressed ? 0.97 : 1.02,
      });
      setHighlight({ x: x * 100, y: y * 100, visible: true });
    });
  }

  function handlePointerLeave() {
    // Geplanten Frame verwerfen, damit ein noch gequeutes Move den
    // Reset nicht direkt wieder überschreibt.
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    lastPointerRef.current = null;
    setTilt({ x: 0, y: 0, scale: 1 });
    setHighlight((h) => ({ ...h, visible: false }));
    setPressed(false);
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      style={{
        perspective: "1200px",
        position: "relative",
        width: "100%",
        height: "100%",
        cursor: reducedMotion ? "default" : "grab",
        // Wenn gedrückt: subtle grab-Cursor-Wechsel.
        ...(pressed && !reducedMotion ? { cursor: "grabbing" } : {}),
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: reducedMotion
            ? "none"
            : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${tilt.scale})`,
          // Smooth zurück nach Pointer-Leave, ohne zu schwergängig bei Move.
          // ease-out feels natural.
          transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className={fit === "contain" ? "object-contain" : "object-cover"}
          sizes={sizes}
          priority={priority}
          draggable={false}
        />

        {/* Highlight: subtiles radial-Glow folgt der Maus, mix-blend
            soft-light damit es nur auf hellen Stellen sichtbar wird */}
        {!reducedMotion && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              opacity: highlight.visible ? 1 : 0,
              transition: "opacity 200ms ease-out",
              backgroundImage: `radial-gradient(circle 220px at ${highlight.x}% ${highlight.y}%, rgba(255,255,255,0.18), transparent 60%)`,
              pointerEvents: "none",
              mixBlendMode: "soft-light",
            }}
          />
        )}
      </div>
    </div>
  );
}
