"use client";

import { useState, useEffect } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

const STORAGE_KEY = "research-disclaimer-accepted";

export function ResearchDisclaimer() {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Only show if not previously accepted
    if (typeof window !== "undefined") {
      const accepted = localStorage.getItem(STORAGE_KEY);
      if (!accepted) setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-8 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-6">
          <FlaskConical className="h-7 w-7 text-primary" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center mb-4">
          Nur für Forschungszwecke
        </h2>

        {/* Text */}
        <p className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
          Alle Produkte von {APP_NAME} sind ausschließlich als
          Referenzmaterialien für die In-vitro-Forschung bestimmt. Sie sind
          nicht für den menschlichen oder tierischen Konsum vorgesehen und
          dürfen nicht für therapeutische, diagnostische oder medizinische
          Zwecke verwendet werden.
        </p>

        {/* Checkbox */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border accent-primary shrink-0"
          />
          <span className="text-sm leading-relaxed">
            Ich bestätige, dass ich ein qualifizierter Forscher oder
            Laborexperte bin und die Produkte ausschließlich für
            Forschungszwecke verwende.
          </span>
        </label>

        {/* Button */}
        <Button
          onClick={handleAccept}
          disabled={!checked}
          className="w-full h-11"
          size="lg"
        >
          Bestätigen und fortfahren
        </Button>
      </div>
    </div>
  );
}
