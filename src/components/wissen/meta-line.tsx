import { cn } from "@/lib/utils";

/**
 * Mono-Meta-Zeile unter Article-Cards und im Artikel-Header —
 * reine Messdaten-Typo (IBM Plex Mono), Felder durch Mittelpunkte
 * getrennt. Optional alle Felder — rendert nur was tatsächlich
 * übergeben wurde, Separatoren stehen nur ZWISCHEN Feldern.
 * `dark` schaltet auf Ink-Section-Foreground (für Featured-Card auf
 * dunklem Hintergrund).
 */

interface Props {
  author?: string | null;
  time?: string | null;
  date?: string | null;
  updated?: string | null;
  dark?: boolean;
  className?: string;
}

export function MetaLine({
  author,
  time,
  date,
  updated,
  dark = false,
  className,
}: Props) {
  const colorClass = dark ? "text-ink-muted" : "text-muted-foreground";
  const items = [
    author ?? null,
    time ?? null,
    date ?? null,
    updated ? `Akt. ${updated}` : null,
  ].filter((it): it is string => Boolean(it));

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "mono-label flex flex-wrap items-center gap-x-2.5 gap-y-1",
        colorClass,
        className,
      )}
      style={{ fontSize: 10.5 }}
    >
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-x-2.5">
          {i > 0 && (
            <span aria-hidden="true" className="opacity-40">
              ·
            </span>
          )}
          {it}
        </span>
      ))}
    </div>
  );
}
