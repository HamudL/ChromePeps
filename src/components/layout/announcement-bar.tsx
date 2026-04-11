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

    fetch("/api/admin/announcement")
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

  return (
    <div
      className={`relative bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-zinc-200 text-center text-xs py-1.5 px-8 transition-all duration-300 ease-out overflow-hidden ${
        closing ? "max-h-0 opacity-0 py-0" : "max-h-12 opacity-100"
      }`}
    >
      <span className="tracking-wide">{text}</span>
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10 transition-colors"
        aria-label="Hinweis schließen"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
