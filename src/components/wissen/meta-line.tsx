import { Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mono-Meta-Zeile unter Article-Cards und im Artikel-Header.
 * Optional alle Felder — rendert nur was tatsächlich übergeben wurde.
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
  return (
    <div
      className={cn(
        "mono-label flex flex-wrap items-center gap-x-3 gap-y-1",
        colorClass,
        className,
      )}
    >
      {author && (
        <span className="inline-flex items-center gap-1.5">
          <User size={11} />
          {author}
        </span>
      )}
      {time && (
        <span className="inline-flex items-center gap-1.5">
          <span className="opacity-50">·</span>
          <Clock size={11} />
          {time}
        </span>
      )}
      {date && (
        <span className="inline-flex items-center gap-1.5">
          <span className="opacity-50">·</span>
          {date}
        </span>
      )}
      {updated && (
        <span className="inline-flex items-center gap-1.5 opacity-70">
          <span className="opacity-50">·</span>
          Akt. {updated}
        </span>
      )}
    </div>
  );
}
