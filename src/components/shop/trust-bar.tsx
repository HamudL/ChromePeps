"use client";

/**
 * Trust Bar — interaktive Specimen-Tags mit Evidence-Tooltips.
 *
 * Eine Reihe eckiger Proben-Etiketten (Mono-Typo, 2px-Radius) auf der
 * Ink-Fläche im Anschluss an "Warum ChromePeps?". Jedes Tag ist
 * hover-/tap-bar und zeigt einen kurzen, konkreten Beleg statt einer
 * Floskel.
 *
 * Accessibility:
 * - Jedes Tag ist ein <button> mit aria-describedby auf seinen Tooltip.
 * - Tooltip erscheint bei Hover, Fokus und Tap.
 * - ESC schließt offene Tooltips; Klick außerhalb ebenfalls.
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
    label: "Gratis Versand ab 200 €",
    tipTitle: "DHL · 24 bis 48 h",
    tipBody:
      "Versand aus Deutschland werktags bis 15 Uhr am selben Tag. Ø Zustellzeit DE 1,3 Werktage.",
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
    tipTitle: "DHL · Deutschland",
    tipBody:
      "Diskreter Versand in stabiler, neutraler Verpackung. CoA und Lot-Tracking automatisch per E-Mail nach Versand.",
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
    // border-t setzt eine dezente Trennung zur vorgelagerten ink-Section
    // ("Warum ChromePeps?"), damit die Vertrauens-Tags thematisch
    // anschließen, ohne den Light/Dark-Rhythmus zu brechen.
    <section
      className="section-ink relative border-t border-ink-border/60"
      aria-label="Belegbare Standards"
    >
      <div className="container pt-8 pb-14">
        {/* Kicker links, Mess-Lineal füllt die Zeile — editorial statt
            zentriert. */}
        <div className="mb-6 flex items-center gap-6">
          <span className="eyebrow shrink-0">Belegbare Standards</span>
          <div className="tick-rule hidden min-w-0 flex-1 sm:block" aria-hidden />
        </div>
        <div
          ref={rootRef}
          className="flex flex-wrap items-center gap-2 md:gap-3"
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
                    // Eckiges Specimen-Tag statt runder Pille.
                    "inline-flex items-center gap-2 rounded-[2px] px-3.5 py-2",
                    "border border-ink-border bg-white/[0.04]",
                    "font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-foreground/90",
                    "transition-colors duration-200",
                    "hover:border-primary/60 hover:bg-primary/10 hover:text-ink-foreground",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isOpen &&
                      "border-primary/60 bg-primary/10 text-ink-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="whitespace-nowrap">{pill.label}</span>
                </button>

                <div
                  id={`trust-tip-${i}`}
                  role="tooltip"
                  className={cn(
                    "absolute bottom-full left-1/2 z-30 mb-3 -translate-x-1/2",
                    "w-64 rounded-[2px] border border-ink-border bg-[hsl(218_35%_5%)] p-3.5",
                    "shadow-[0_12px_40px_hsl(218_40%_2%/0.6)]",
                    "pointer-events-none transition-all duration-200",
                    isOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-0"
                  )}
                >
                  <p className="mono-tag mb-1.5 text-primary">
                    {pill.tipTitle}
                  </p>
                  <p className="text-xs leading-relaxed text-ink-muted">
                    {pill.tipBody}
                  </p>
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-[6px] border-transparent border-t-ink-border"
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
