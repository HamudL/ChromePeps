"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ProductVialTurntable — 360°-Turntable-Viewer aus pre-rendered Cycles-Frames.
 *
 * Statt Echtzeit-WebGL (three.js) zeigt diese Komponente eine Sequenz
 * von photoreal vorgerenderten Standbildern (eins pro 10° Drehung).
 * Maus-Drag scrubbt durch die Frames, idle dreht sich der Vial auto.
 *
 * Warum so:
 *   - Echtzeit-WebGL kann bei Glas/Metall nicht an die Qualität von
 *     Path-Tracing/AI-generierten Produktbildern rankommen. 36 vor-
 *     gerenderte Cycles-Frames erreichen Photo-Qualität.
 *   - Trade-off: nur 360°-Rotation um die Z-Achse, kein Tilt/Zoom.
 *
 * Assets:
 *   - `public/3d/vial-turntable/frame_01.webp` … `frame_36.webp`
 *   - WebP mit Alpha (transparenter Hintergrund), ~30 KB pro Frame
 *   - Total ~1.1 MB, lädt fortlaufend nach dem ersten Bild
 *
 * A11y:
 *   - `prefers-reduced-motion: reduce` → kein Auto-Rotate, Frame 1 statisch
 *   - `touch-action: none` für sauberes Drag auf Touch-Devices
 *   - alt-Text aus Props
 */

const TOTAL_FRAMES = 36;
const FRAME_URLS = Array.from(
  { length: TOTAL_FRAMES },
  (_, i) =>
    `/3d/vial-turntable/frame_${String(i + 1).padStart(2, "0")}.webp`,
);

// Auto-Rotate: ein Frame alle 110 ms ⇒ ein voller Turn in ~4 s.
const AUTO_ROTATE_INTERVAL_MS = 110;
// Nach User-Interaktion pausiert Auto-Rotate für eine Weile.
const PAUSE_AFTER_INTERACTION_MS = 2500;
// Maus-Empfindlichkeit beim Drag: alle 8 px ein Frame weiter.
const DRAG_PIXELS_PER_FRAME = 8;

interface Props {
  /** Alt-Text fürs aktuelle Frame-Bild. */
  alt?: string;
}

export function ProductVialTurntable({
  alt = "3D-Vial — drehen per Drag",
}: Props) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const lastInteractionAtRef = useRef(0);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartFrameRef = useRef(0);

  // prefers-reduced-motion respektieren
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setAutoRotateEnabled(!mq.matches);
    const handler = (e: MediaQueryListEvent) =>
      setAutoRotateEnabled(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Frames im Hintergrund vorladen — beim ersten Mount, alle 36 in den
  // HTTP-Cache, damit Drag-Scrubbing ohne Lade-Hängen läuft.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const imgs: HTMLImageElement[] = [];
    for (const url of FRAME_URLS) {
      const img = new Image();
      img.src = url;
      imgs.push(img);
    }
    // No cleanup needed; the browser caches the requests.
  }, []);

  // Auto-Rotate-Loop
  useEffect(() => {
    if (!autoRotateEnabled) return;
    const id = window.setInterval(() => {
      if (dragStartXRef.current !== null) return; // user dragging
      if (
        Date.now() - lastInteractionAtRef.current <
        PAUSE_AFTER_INTERACTION_MS
      )
        return; // pause shortly after interaction
      setFrameIdx((i) => (i + 1) % TOTAL_FRAMES);
    }, AUTO_ROTATE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [autoRotateEnabled]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // primary button / touch only
      if (e.button !== 0 && e.pointerType === "mouse") return;
      setIsDragging(true);
      lastInteractionAtRef.current = Date.now();
      dragStartXRef.current = e.clientX;
      dragStartFrameRef.current = frameIdx;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // setPointerCapture can fail in rare cases; ignore.
      }
    },
    [frameIdx],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragStartXRef.current === null) return;
      const dx = e.clientX - dragStartXRef.current;
      const frameDelta = Math.round(dx / DRAG_PIXELS_PER_FRAME);
      // Drag nach rechts ⇒ Frame-Index sinkt (Vial dreht "weg" vom Drag).
      // Fühlt sich an wie an einer Drehscheibe ziehen.
      const newIdx =
        (((dragStartFrameRef.current - frameDelta) % TOTAL_FRAMES) +
          TOTAL_FRAMES) %
        TOTAL_FRAMES;
      setFrameIdx(newIdx);
      lastInteractionAtRef.current = Date.now();
    },
    [],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setIsDragging(false);
      lastInteractionAtRef.current = Date.now();
      dragStartXRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // releasePointerCapture can fail; ignore.
      }
    },
    [],
  );

  return (
    <div
      role="img"
      aria-label={alt}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDragStart={(e) => e.preventDefault()}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Aktuelles Frame als img — der src wechselt je nach frameIdx,
          alle Frames sind durch den Preload bereits im HTTP-Cache. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={FRAME_URLS[frameIdx]}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
