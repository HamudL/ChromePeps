"use client";

/**
 * Idea 07 — HPLC Chromatogram as ambient hero accent
 *
 * Meant for the /qualitaetskontrolle hero. Canvas-based, self-sizing, pauses
 * when off-screen. Renders a clean dark panel with an animated curve that
 * draws in on first view, a highlighted main peak with retention-time
 * callout, and a subtle time-axis.
 *
 * The component is a self-contained panel; compose it beside your headline
 * in a two-column hero. Unlike PeptideNetwork it does NOT skip on mobile —
 * a chromatogram is the entire point of the Qualität page.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface HplcSpectrumProps {
  purity?: number;
  retentionMinutes?: number;
  lot?: string;
  className?: string;
  height?: number;
}

export function HplcSpectrum({
  purity = 99.24,
  retentionMinutes = 6.48,
  lot = "CP\u20112411\u2011BPC",
  className,
  height = 360,
}: HplcSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let progress = 0;
    let startAt = 0;

    const peaks = [
      { x: 0.22, h: 0.05, w: 0.02 },
      { x: 0.38, h: 0.08, w: 0.025 },
      { x: 0.58, h: 0.92, w: 0.015 },
      { x: 0.72, h: 0.04, w: 0.015 },
      { x: 0.84, h: 0.06, w: 0.02 },
    ];

    const baseline = (x: number) =>
      0.02 + 0.01 * Math.sin(x * 40) + 0.005 * Math.sin(x * 110);

    const curveAt = (x: number) => {
      let y = baseline(x);
      for (const p of peaks) {
        const d = (x - p.x) / p.w;
        y += p.h * Math.exp(-d * d);
      }
      return y;
    };

    const size = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    size();

    const draw = (now: number) => {
      if (!startAt) startAt = now;
      const elapsed = now - startAt;
      progress = reducedMotion ? 1 : Math.min(1, elapsed / 2200);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = "hsl(20 10% 15%)";
      ctx.lineWidth = 1 * dpr;
      for (let i = 0; i <= 4; i++) {
        const y = h * (0.18 + 0.72 * (i / 4));
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // x-axis labels (retention time)
      ctx.fillStyle = "hsl(30 8% 38%)";
      ctx.font = `${10 * dpr}px "Geist Mono", ui-monospace, monospace`;
      for (let i = 0; i <= 5; i++) {
        const x = w * (i / 5);
        const min = (i * 2).toFixed(1);
        ctx.fillText(`${min} min`, x + 4 * dpr, h - 8 * dpr);
      }

      const marginBottom = 0.12;
      const top = 0.18;
      const end = progress;

      // filled area under curve
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const x = i / 400;
        if (x > end) break;
        const cy = curveAt(x);
        const px = x * w;
        const py = h * (1 - marginBottom) - cy * h * (1 - marginBottom - top);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineTo(end * w, h * (1 - marginBottom));
      ctx.lineTo(0, h * (1 - marginBottom));
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
      fillGrad.addColorStop(0, "hsl(45 93% 55% / 0.22)");
      fillGrad.addColorStop(1, "hsl(45 93% 55% / 0)");
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // curve line
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const x = i / 400;
        if (x > end) break;
        const cy = curveAt(x);
        const px = x * w;
        const py = h * (1 - marginBottom) - cy * h * (1 - marginBottom - top);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "hsl(45 70% 40%)");
      grad.addColorStop(0.58, "hsl(45 93% 60%)");
      grad.addColorStop(1, "hsl(30 80% 55%)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2 * dpr;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // main peak annotation (after draw-in completes)
      if (progress > 0.65) {
        const px = 0.58 * w;
        const cy = curveAt(0.58);
        const py = h * (1 - marginBottom) - cy * h * (1 - marginBottom - top);

        ctx.setLineDash([2 * dpr, 4 * dpr]);
        ctx.strokeStyle = "hsl(45 93% 60% / 0.35)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, h * (1 - marginBottom));
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "hsl(45 93% 60%)";
        ctx.beginPath();
        ctx.arc(px, py, 4 * dpr, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `500 ${11 * dpr}px "Geist Mono", ui-monospace, monospace`;
        ctx.fillText(
          `t=${retentionMinutes.toFixed(2)} min`,
          px + 8 * dpr,
          py - 6 * dpr
        );
      }

      if (progress < 1) raf = requestAnimationFrame(draw);
    };

    // Start when on-screen, pause off-screen
    let started = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          raf = requestAnimationFrame(draw);
        }
      },
      { threshold: 0.2 }
    );
    io.observe(canvas);

    const onResize = () => {
      size();
      startAt = 0;
      progress = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [reducedMotion, retentionMinutes]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[hsl(20_10%_18%)] bg-[hsl(20_14%_4%)]",
        className
      )}
      style={{ height }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Top-left label */}
      <div className="absolute top-5 left-5 z-10">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary font-semibold">
          HPLC · Analysis
        </p>
        <p className="mt-3 font-sans text-2xl md:text-3xl font-semibold text-[hsl(40_10%_92%)] tracking-tight">
          {purity.toFixed(2)}% Reinheit.
        </p>
        <p className="mt-1.5 text-xs text-[hsl(30_6%_62%)] max-w-xs leading-relaxed">
          Unabhängig verifiziert durch Janoshik Labs · Lot {lot}
        </p>
      </div>

      {/* Bottom-right watermark */}
      <div className="absolute bottom-4 right-5 z-10">
        <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-[hsl(30_8%_38%)]">
          Retention Time →
        </p>
      </div>
    </div>
  );
}
