"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBar() {
  const [text, setText] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Don't re-fetch if user already dismissed this session
    if (sessionStorage.getItem("announcement-dismissed")) {
      setVisible(false);
      return;
    }

    fetch("/api/announcement")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.enabled && json.data.text) {
          setText(json.data.text);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setClosing(true);
    sessionStorage.setItem("announcement-dismissed", "1");
    // Wait for animation to finish, then remove from DOM
    setTimeout(() => setVisible(false), 300);
  };

  if (!text || !visible) return null;

  // Schmaler Mono-Streifen auf Ink — kaltes Nachtblau, kein Verlauf.
  return (
    <div
      className={`relative overflow-hidden border-b border-ink-border bg-ink px-8 py-1.5 text-center text-ink-foreground transition-all duration-300 ease-out ${
        closing ? "max-h-0 py-0 opacity-0" : "max-h-12 opacity-100"
      }`}
    >
      <span className="font-mono text-[10.5px] uppercase leading-tight tracking-[0.14em]">
        {text}
      </span>
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-ink-muted transition-colors hover:bg-white/10 hover:text-ink-foreground"
        aria-label="Hinweis schließen"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
