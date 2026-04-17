"use client";

import { useEffect, useRef, useState } from "react";

interface PeptideNetworkProps {
  /** Particle count. Default 55. */
  count?: number;
  /** Use lighter particle color for dark backgrounds. */
  dark?: boolean;
  /** Optional extra class for the canvas. */
  className?: string;
}

/**
 * Canvas-based peptide / molecule network.
 *
 * Dots drift slowly, repel from the cursor, and connect to nearby neighbors.
 * Mobile devices and users with `prefers-reduced-motion: reduce` skip the
 * render loop entirely (component returns null). Off-screen and tab-hidden
 * instances pause the animation loop.
 *
 * Must live inside a `position: relative` parent that has defined size.
 * Cursor is tracked on the window, so the parent structure is irrelevant.
 */
export function PeptideNetwork({
  count = 55,
  dark = false,
  className,
}: PeptideNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  // Gate: mobile + reduced-motion skip. Runs once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const okSize = window.matchMedia("(min-width: 768px)").matches;
    const okMotion = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    if (okSize && okMotion) setShouldRender(true);
  }, []);

  useEffect(() => {
    if (!shouldRender) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let isLooping = false;
    let isVisible = true;
    let sized = false;

    const seed = () => {
      const a = Math.random() * Math.PI * 2;
      const s = (0.2 + Math.random() * 0.3) * dpr;
      return {
        x: Math.random() * (canvas.width || 1200),
        y: Math.random() * (canvas.height || 500),
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: (Math.random() * 1.1 + 1.1) * dpr,
      };
    };
    let particles: ReturnType<typeof seed>[] = [];

    // Cursor in window coords — converted to canvas-local each frame
    const mouse = { x: -9999, y: -9999 };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    const tick = () => {
      // Self-size every frame (cheap: one getBoundingClientRect call). Robust
      // across layout shifts, HMR, navigation, and parents that size late.
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (targetW > 0 && targetH > 0) {
        if (canvas.width !== targetW) canvas.width = targetW;
        if (canvas.height !== targetH) canvas.height = targetH;
        if (!sized) {
          particles = Array.from({ length: count }, seed);
          sized = true;
        }
      }

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0 || !sized) {
        raf = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      // Convert window cursor → canvas-local
      const mx = (mouse.x - rect.left) * dpr;
      const my = (mouse.y - rect.top) * dpr;

      const R = 160 * dpr;
      const baseSpeed = 0.4 * dpr;

      for (const p of particles) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 1) {
          const d = Math.sqrt(d2);
          const force = (1 - d / R) * 0.75 * dpr;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
        // Jitter + damping + cruise-floor — keeps motion organic, never rests
        p.vx += (Math.random() - 0.5) * 0.02 * dpr;
        p.vy += (Math.random() - 0.5) * 0.02 * dpr;
        p.vx *= 0.985;
        p.vy *= 0.985;
        const s = Math.hypot(p.vx, p.vy);
        if (s < baseSpeed) {
          const k = s === 0 ? 1 : baseSpeed / s;
          p.vx *= k;
          p.vy *= k;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? "hsl(45 85% 62% / 0.85)"
          : "hsl(45 80% 48% / 0.7)";
        ctx.fill();
      }

      const link = 140 * dpr;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < link * link) {
            const alpha = (1 - Math.sqrt(d2) / link) * (dark ? 0.35 : 0.28);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = dark
              ? `hsl(45 70% 60% / ${alpha})`
              : `hsl(45 70% 45% / ${alpha})`;
            ctx.lineWidth = 0.7 * dpr;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (isLooping) return;
      isLooping = true;
      raf = requestAnimationFrame(tick);
    };
    const stopLoop = () => {
      if (!isLooping) return;
      isLooping = false;
      cancelAnimationFrame(raf);
    };

    // Kick off immediately — don't wait for observers.
    startLoop();

    // Pause when off-screen. Purely optimization; loop already runs.
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !document.hidden) startLoop();
        else stopLoop();
      },
      { rootMargin: "100px" },
    );
    io.observe(canvas);

    // Pause when tab hidden.
    const onVisibilityChange = () => {
      if (document.hidden) stopLoop();
      else if (isVisible) startLoop();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopLoop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [shouldRender, count, dark]);

  if (!shouldRender) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}
    />
  );
}
