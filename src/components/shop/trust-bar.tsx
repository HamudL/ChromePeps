"use client";

/**
 * Idea 04 — Trust Bar with evidence tooltips
 *
 * Replaces the static Trust Bar on the homepage (grid of 4 icon+label cells)
 * with an interactive pill row. Each pill is hoverable/tappable and reveals
 * a short, specific piece of evidence. The bar lives inside a .section-dark
 * container — we keep that context intact, only the pill styling is new.
 *
 * Accessibility:
 * - Each pill is a <button> with aria-describedby pointing to its tooltip.
 * - Tooltip appears on hover, focus, and tap.
 * - ESC closes any open tooltip; click outside also closes.
 */

import { useState, useRef, useEffect } from "react";
import { BadgeCheck, Truck, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Pill {
  icon: typeof BadgeCheck;
  label: string;
  tipTitle: string;
  tipBody: string;
}

const PILLS: Pill[] = [
  {
    icon: BadgeCheck,
    label: "Laborgeprüft",
    tipTitle: "HPLC · UV 220 nm",
    tipBody:
      "Jede Charge wird vor Freigabe durch Janoshik Labs (unabhängig, CZ) auf Reinheit analysiert. Mindeststandard 98 %.",
  },
  {
    icon: Truck,
    label: "Gratis Versand ab 100\u00A0€",
    tipTitle: "DHL · 24–48 h",
    tipBody:
      "Versand aus Berlin werktags bis 15 Uhr am selben Tag. Ø Zustellzeit DE 1.3 Werktage.",
  },
  {
    icon: ShieldCheck,
    label: "Sichere Zahlung",
    tipTitle: "Stripe · PCI‑DSS Level 1",
    tipBody:
      "Stripe, Apple Pay, Google Pay oder SEPA. Keine Kartendaten werden bei ChromePeps gespeichert.",
  },
  {
    icon: Zap,
    label: "Schnelle Lieferung",
    tipTitle: "Ab Berlin · Kühlversand",
    tipBody:
      "Temperaturgeführter Versand in isolierter Verpackung. CoA & Lot‑Tracking automatisch per E-Mail nach Versand.",
  },
];

export function TrustBar() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onClick);
    };
  }, []);

  return (
    <section className="section-dark">
      <div className="container py-6">
        <div
          ref={rootRef}
          className="flex flex-wrap items-center justify-center gap-2 md:gap-3"
        >
          {PILLS.map((pill, i) => {
            const Icon = pill.icon;
            const isOpen = openIndex === i;
            return (
              <div key={pill.label} className="relative">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-describedby={`trust-tip-${i}`}
                  onMouseEnter={() => setOpenIndex(i)}
                  onMouseLeave={() => setOpenIndex(null)}
                  onFocus={() => setOpenIndex(i)}
                  onBlur={() => setOpenIndex(null)}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3.5 py-2",
                    "border border-white/10 bg-white/5 text-sm font-medium text-white/90",
                    "transition-all duration-200",
                    "hover:border-primary/50 hover:bg-primary/10 hover:text-white",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    isOpen && "border-primary/50 bg-primary/10 text-white"
                  )}
                >
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="whitespace-nowrap">{pill.label}</span>
                </button>

                <div
                  id={`trust-tip-${i}`}
                  role="tooltip"
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-30",
                    "w-64 rounded-lg border border-primary/30 bg-[hsl(20_14%_4%)] p-3.5",
                    "shadow-[0_12px_40px_hsl(0_0%_0%/0.5)]",
                    "transition-all duration-200 pointer-events-none",
                    isOpen
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-1"
                  )}
                >
                  <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-primary font-semibold mb-1.5">
                    {pill.tipTitle}
                  </p>
                  <p className="text-xs leading-relaxed text-white/80">
                    {pill.tipBody}
                  </p>
                  <span
                    aria-hidden
                    className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-[6px] border-transparent border-t-primary/30"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
