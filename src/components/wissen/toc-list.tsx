"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/lib/wissen/extract-toc";

/**
 * Sticky Table-of-Contents-Liste mit IntersectionObserver-basiertem
 * Active-State. Markiert beim Scrollen den aktuellen H2/H3 — die
 * Heuristik: das oberste Heading, dessen Top im oberen Drittel des
 * Viewports oder darüber liegt, gilt als aktiv.
 *
 * IntersectionObserver mit asymmetrischem rootMargin (top -10%, bottom
 * -70%) — definiert ein schmales Aktivitäts-Band knapp unterhalb des
 * Header-Sticky-Bereichs. Das ist robuster als Scroll-Position-Math
 * mit `getBoundingClientRect()` weil wir auch beim Wechsel von schnellen
 * zu langsamen Scroll-Geschwindigkeiten konsistent bleiben.
 */
interface Props {
  items: TocItem[];
}

export function TocList({ items }: Props) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) return;

    const ids = items.map((it) => it.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Filter intersecting entries und nimm das oberste (kleinster
        // boundingClientRect.top). So bleibt der Active-Eintrag stabil
        // wenn mehrere H2/H3 gleichzeitig im Viewport sind.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        // Aktivitäts-Band: 10 % Viewport-Offset oben (unterhalb sticky
        // Header), 70 % Offset unten — d.h. nur die obersten 20 % des
        // Viewports zählen als "aktiv".
        rootMargin: "-10% 0% -70% 0%",
        threshold: 0,
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Inhaltsverzeichnis" className="not-prose">
      <p
        className="mono-tag text-muted-foreground mb-3"
        style={{ fontSize: 10 }}
      >
        Inhalt
      </p>
      <ul className="m-0 p-0 list-none">
        {items.map((it) => (
          <li key={it.id} className="m-0">
            <a
              href={`#${it.id}`}
              className={cn(
                "toc-link",
                it.lvl === 3 && "lvl-3",
                activeId === it.id && "active",
              )}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
