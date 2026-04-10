"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBar() {
  const [text, setText] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't re-fetch if user already dismissed this session
    if (sessionStorage.getItem("announcement-dismissed")) return;

    fetch("/api/admin/announcement")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.enabled && json.data.text) {
          setText(json.data.text);
        }
      })
      .catch(() => {});
  }, []);

  if (!text || dismissed) return null;

  return (
    <div className="relative bg-primary text-primary-foreground text-center text-sm py-2 px-8">
      <span>{text}</span>
      <button
        onClick={() => {
          setDismissed(true);
          sessionStorage.setItem("announcement-dismissed", "1");
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-primary-foreground/20 transition-colors"
        aria-label="Hinweis schließen"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
