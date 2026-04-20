"use client";

/**
 * Idea 01 — Certificate Vault Flip-Card
 *
 * A flippable premium card showing lot + purity on the front and a
 * stylised HPLC chromatogram on the back. Designed to REPLACE the plain
 * "CoA-Link" on a product detail page. Uses the existing light-mode
 * palette (background 40 20% 98%, foreground 20 14% 10%) with the
 * gold/amber primary as accent. The back face is inverted (dark) for
 * contrast and to feel like a "vault" moment.
 *
 * All props are optional so the component can render a marketing-grade
 * placeholder on pages where no CoA data is wired up yet.
 */

import { useState } from "react";
import { Check, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CertificateCardProps {
  lot?: string;
  /** Purity as a fraction value, e.g. 99.24 */
  purity?: number | null;
  /** Human-readable test date, e.g. "14 Apr 2026" */
  testedAt?: string;
  method?: string;
  lab?: string;
  /**
   * Optional retention time of the main peak in minutes. We only render
   * this label when a value is provided — showing a hardcoded default
   * would lie to customers about a lab measurement.
   */
  retentionMinutes?: number;
  pdfUrl?: string | null;
  className?: string;
}

export function CertificateCard({
  lot = "CP-2411-BPC",
  purity = 99.24,
  testedAt = "14 Apr 2026",
  method = "HPLC · UV 220 nm",
  lab = "Janoshik Labs",
  retentionMinutes,
  pdfUrl,
  className,
}: CertificateCardProps) {
  const [flipped, setFlipped] = useState(false);
  const purityDisplay =
    typeof purity === "number" ? purity.toFixed(2) : "—";
  const hasPdf = typeof pdfUrl === "string" && pdfUrl.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="relative w-full aspect-[1.58/1] max-w-sm [perspective:1200px] cursor-pointer group"
        onClick={() => setFlipped((v) => !v)}
        role="button"
        aria-label="Analysezertifikat anzeigen"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((v) => !v);
          }
        }}
      >
        <div
          className={cn(
            "relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]",
            flipped && "[transform:rotateY(180deg)]"
          )}
        >
          {/* FRONT */}
          <div
            className={cn(
              "absolute inset-0 rounded-xl border border-border/70 bg-card overflow-hidden p-5 flex flex-col justify-between",
              "[backface-visibility:hidden]",
              "shadow-[0_12px_40px_-20px_hsl(20_14%_10%/0.18)]",
              "transition-shadow group-hover:shadow-[0_20px_60px_-20px_hsl(45_80%_30%/0.25)]"
            )}
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 15%, hsl(45 80% 50% / 0.08), transparent 55%),
                repeating-linear-gradient(45deg, hsl(45 50% 50% / 0.025) 0, hsl(45 50% 50% / 0.025) 1px, transparent 1px, transparent 5px)
              `,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-primary font-semibold">
                  Certificate of Analysis
                </p>
                <p className="font-mono text-sm text-foreground mt-1.5">{lot}</p>
              </div>
              {/* "Passed" seal */}
              <div
                className="h-10 w-10 rounded-full grid place-items-center text-background shrink-0"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, hsl(45 85% 70%), hsl(45 80% 40%))",
                  boxShadow: "0 0 16px hsl(45 80% 50% / 0.3)",
                }}
                aria-hidden
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </div>
            </div>

            <div>
              <div className="flex items-baseline">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums leading-none">
                  {purityDisplay}
                </span>
                <span className="text-primary text-sm ml-1 font-semibold">%</span>
              </div>
              <p className="font-mono text-[10.5px] text-muted-foreground mt-2 leading-relaxed">
                {method} · {lab} · {testedAt}
              </p>
            </div>
          </div>

          {/* BACK */}
          <div
            className={cn(
              "absolute inset-0 rounded-xl border overflow-hidden p-5 flex flex-col",
              "[backface-visibility:hidden] [transform:rotateY(180deg)]",
              "bg-[hsl(20_14%_6%)] border-[hsl(20_10%_18%)] text-[hsl(40_10%_92%)]"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-primary font-semibold">
                Chromatogram
              </p>
              {typeof retentionMinutes === "number" && (
                <p className="font-mono text-[10.5px] text-[hsl(30_6%_55%)]">
                  t = {retentionMinutes.toFixed(2)} min
                </p>
              )}
            </div>

            {/* Mini chromatogram — stilisiert, kein echter Datensatz.
                Ein reales Chromatogramm je Charge zu rendern würde eine
                strukturierte Peak-Tabelle pro COA erfordern, die es noch
                nicht gibt. Die Form ist generisch HPLC-typisch (Baseline
                + ein Hauptpeak bei ~58% Retention-Achse) und dient als
                Visual Cue, nicht als wissenschaftliche Darstellung. */}
            <div className="flex-1 my-3 rounded-md overflow-hidden relative bg-[hsl(20_12%_9%)]">
              <svg
                viewBox="0 0 300 100"
                className="w-full h-full"
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  <linearGradient id="ccPeakFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(45 93% 55%)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="hsl(45 93% 55%)" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="ccPeakLine" x1="0" x2="1">
                    <stop offset="0%" stopColor="hsl(45 70% 40%)" />
                    <stop offset="55%" stopColor="hsl(45 93% 60%)" />
                    <stop offset="100%" stopColor="hsl(30 80% 55%)" />
                  </linearGradient>
                </defs>
                {[25, 50, 75].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    x2="300"
                    y1={y}
                    y2={y}
                    stroke="hsl(20 10% 15%)"
                    strokeWidth="0.5"
                  />
                ))}
                <path
                  d="M 0 90 L 40 88 L 70 85 L 100 82 L 130 78 L 150 68 L 165 30 L 175 8 L 185 28 L 200 66 L 220 80 L 250 86 L 280 88 L 300 90 L 300 100 L 0 100 Z"
                  fill="url(#ccPeakFill)"
                />
                <path
                  d="M 0 90 L 40 88 L 70 85 L 100 82 L 130 78 L 150 68 L 165 30 L 175 8 L 185 28 L 200 66 L 220 80 L 250 86 L 280 88 L 300 90"
                  stroke="url(#ccPeakLine)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="175" cy="8" r="2.5" fill="hsl(45 93% 60%)" />
                <line
                  x1="175"
                  x2="175"
                  y1="8"
                  y2="90"
                  stroke="hsl(45 93% 60% / 0.4)"
                  strokeWidth="0.5"
                  strokeDasharray="2 3"
                />
              </svg>
            </div>

            {hasPdf ? (
              <a
                href={pdfUrl!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-between gap-2 text-xs font-medium text-primary hover:text-[hsl(45_93%_65%)] transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Vollständiges PDF öffnen
                </span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <p className="inline-flex items-center gap-1.5 text-xs text-[hsl(30_6%_55%)]">
                <FileText className="h-3.5 w-3.5" />
                PDF auf Anfrage
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground text-center">
        ↻ Klick zum Umdrehen
      </p>
    </div>
  );
}
