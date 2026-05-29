"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Leichtgewichtiger Dark-Mode-Toggle (bewusst KEIN next-themes — spart die
 * Dependency und einen Client-Provider um den ganzen Baum).
 *
 * Setzt/entfernt die `.dark`-Klasse am <html> und persistiert die Wahl in
 * localStorage. Das Inline-Head-Script in layout.tsx setzt `.dark` bereits
 * VOR First Paint (kein FOUC); dieser Toggle hält nur den Client-State synchron.
 * Default ist Light — Dark wird bewusst aktiviert (kein system-default).
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* localStorage evtl. blockiert — Toggle wirkt dann nur für die Session */
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={
        dark ? "Helles Design aktivieren" : "Dunkles Design aktivieren"
      }
    >
      {/* Vor dem Mount neutral (Mond) — vermeidet Hydration-Mismatch-Flash */}
      {mounted && dark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
