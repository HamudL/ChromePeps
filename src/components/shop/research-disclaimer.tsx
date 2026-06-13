"use client";

import { useState, useEffect, useRef } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

const STORAGE_KEY = "research-disclaimer-accepted";

export function ResearchDisclaimer() {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  // Element, das beim Öffnen den Fokus hatte — wird beim Schließen
  // wiederhergestellt (Standard-Modal-Verhalten, sonst springt der
  // Screenreader-Cursor zurück an den Anfang der Seite).
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Only show if not previously accepted
    if (typeof window !== "undefined") {
      const accepted = localStorage.getItem(STORAGE_KEY);
      if (!accepted) setVisible(true);
    }
  }, []);

  // Modal-Lifecycle: Body-Scroll-Lock, Initial-Fokus auf die Checkbox,
  // Tab-Trap, Escape ignoriert (User MUSS bestätigen — das ist by
  // design für ein research-only-Disclaimer, keine reine UX-Hilfe).
  useEffect(() => {
    if (!visible) return;

    previouslyFocused.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Initial-Fokus: Checkbox, weil der Submit-Button so lange
    // disabled ist, bis sie gehakt ist.
    const focusTimer = window.setTimeout(() => {
      checkboxRef.current?.focus();
    }, 0);

    function getFocusable(): HTMLElement[] {
      if (!dialogRef.current) return [];
      const nodes = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      return Array.from(nodes);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [visible]);

  if (!visible) return null;

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="research-disclaimer-title"
      aria-describedby="research-disclaimer-body"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-lg border border-border bg-background p-8 shadow-2xl"
      >
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-sm bg-primary/10">
          <FlaskConical
            className="h-7 w-7 text-primary-strong"
            aria-hidden="true"
          />
        </div>

        {/* Kicker + Title */}
        <p className="mono-tag mb-3 text-center text-primary-strong">
          Research Use Only
        </p>
        <h2
          id="research-disclaimer-title"
          className="display-title mb-4 text-center text-2xl"
        >
          Nur für Forschungszwecke
        </h2>

        {/* Text */}
        <p
          id="research-disclaimer-body"
          className="text-sm text-muted-foreground text-center leading-relaxed mb-6"
        >
          Alle Produkte von {APP_NAME} werden ausschließlich als
          Referenzmaterialien für die In-vitro-Forschung abgegeben. Sie sind
          nicht zum Konsum durch Menschen oder Tiere bestimmt und nicht für
          therapeutische, diagnostische oder medizinische Zwecke.
        </p>

        {/* Checkbox */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer select-none">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded-sm border-border accent-primary"
          />
          <span className="text-sm leading-relaxed">
            Ich bestätige, dass ich in einem Forschungs- oder Laborkontext
            tätig bin und die Substanzen ausschließlich als Referenzmaterial
            für die In-vitro-Forschung verwende. Mir ist bekannt, dass die
            Produkte nicht zur Anwendung am Menschen oder Tier zugelassen
            sind.
          </span>
        </label>

        {/* Button */}
        <Button
          onClick={handleAccept}
          disabled={!checked}
          variant="gold"
          className="h-11 w-full"
          size="lg"
        >
          Bestätigen und fortfahren
        </Button>
      </div>
    </div>
  );
}
