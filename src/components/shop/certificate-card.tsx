import { Check, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CertificateCard — „Laborbefund"-Dokumentkarte.
 *
 * Statische Papier-Karte im Protokoll-Stil: Mono-Kopfzeile, großer
 * Reinheits-Messwert, stilisierter Chromatogramm-Streifen auf Ink,
 * Befund-Zeilen mit Haarlinien und PDF-Link in der Fußzeile. Keine
 * Flip-Interaktion — ein Befund liegt ruhig auf dem Tisch.
 *
 * Rein präsentational (kein State) und damit server-renderbar. Alle
 * Props sind optional; fehlende Werte werden als „n. v." ausgewiesen
 * statt mit erfundenen Platzhalter-Messwerten zu lügen.
 */

interface CertificateCardProps {
  lot?: string;
  /** Reinheit in Prozent, z.B. 99.24 */
  purity?: number | null;
  /** Menschenlesbares Testdatum, z.B. "14. Apr. 2026" */
  testedAt?: string;
  method?: string;
  lab?: string;
  /**
   * Optionale Retentionszeit des Hauptpeaks in Minuten. Wird nur
   * gerendert, wenn ein Wert übergeben wird — ein hartkodierter
   * Default würde Kunden eine Labormessung vortäuschen.
   */
  retentionMinutes?: number;
  pdfUrl?: string | null;
  className?: string;
}

export function CertificateCard({
  lot,
  purity,
  testedAt,
  method,
  lab,
  retentionMinutes,
  pdfUrl,
  className,
}: CertificateCardProps) {
  const purityDisplay =
    typeof purity === "number" ? purity.toFixed(2) : null;
  const hasPdf = typeof pdfUrl === "string" && pdfUrl.length > 0;

  const rows: { k: string; v: string }[] = [
    { k: "Lot", v: lot ?? "n. v." },
    { k: "Methode", v: method ?? "n. v." },
    { k: "Labor", v: lab ?? "n. v." },
    { k: "Testdatum", v: testedAt ?? "n. v." },
  ];
  if (typeof retentionMinutes === "number") {
    rows.push({ k: "Retention", v: `${retentionMinutes.toFixed(2)} min` });
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card text-card-foreground",
        "shadow-[0_24px_60px_-32px_hsl(218_35%_7%/0.55)]",
        className
      )}
    >
      {/* Kopfzeile: Dokumenttitel + Prüfsiegel */}
      <header className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-strong">
            Certificate of Analysis
          </p>
          {lot && (
            <p className="mt-1.5 font-mono text-sm text-foreground">{lot}</p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-primary px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          Bestanden
        </span>
      </header>

      <div className="tick-rule mx-5 mt-4" aria-hidden />

      {/* Haupt-Messwert */}
      <div className="px-5 pt-5">
        {/* Bewusst Utilities statt .stat-value/.stat-key: die Karte ist
            eine Papier-Fläche und kann INNERHALB von .section-ink
            sitzen — die Ink-Overrides der Stat-Klassen würden hier
            falsch greifen. Die Token-Rescope-Regel für .bg-card in
            globals.css löst die Utilities dagegen korrekt auf. */}
        <p className="flex items-baseline gap-1">
          <span className="font-display text-5xl font-medium leading-none tracking-[-0.01em] tabular-nums text-primary-strong sm:text-6xl">
            {purityDisplay ?? "n. v."}
          </span>
          {purityDisplay && (
            <span className="font-mono text-sm font-semibold text-primary-strong">
              %
            </span>
          )}
        </p>
        <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          Reinheit · Hauptpeak
        </p>
      </div>

      {/* Chromatogramm-Streifen — stilisiert, kein echter Datensatz.
          Ein reales Chromatogramm je Charge zu rendern würde eine
          strukturierte Peak-Tabelle pro COA erfordern, die es noch
          nicht gibt. Die Form ist generisch HPLC-typisch (Baseline +
          ein Hauptpeak) und dient als Visual Cue, nicht als
          wissenschaftliche Darstellung. */}
      <div className="relative mx-5 mt-5 h-20 overflow-hidden rounded-sm bg-ink">
        <svg
          viewBox="0 0 300 100"
          className="h-full w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="coaPeakFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(166 55% 50%)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(166 55% 50%)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              x2="300"
              y1={y}
              y2={y}
              stroke="hsl(217 24% 16%)"
              strokeWidth="0.5"
            />
          ))}
          <path
            d="M 0 90 L 40 88 L 70 85 L 100 82 L 130 78 L 150 68 L 165 30 L 175 8 L 185 28 L 200 66 L 220 80 L 250 86 L 280 88 L 300 90 L 300 100 L 0 100 Z"
            fill="url(#coaPeakFill)"
          />
          <path
            d="M 0 90 L 40 88 L 70 85 L 100 82 L 130 78 L 150 68 L 165 30 L 175 8 L 185 28 L 200 66 L 220 80 L 250 86 L 280 88 L 300 90"
            stroke="hsl(166 58% 55%)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="175" cy="8" r="2.5" fill="hsl(164 60% 66%)" />
          <line
            x1="175"
            x2="175"
            y1="8"
            y2="90"
            stroke="hsl(166 58% 55% / 0.4)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
          />
        </svg>
      </div>

      {/* Befund-Zeilen */}
      <dl className="mt-5 px-5">
        {rows.map((row) => (
          <div
            key={row.k}
            className="flex items-baseline justify-between gap-4 border-t border-border py-2.5"
          >
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {row.k}
            </dt>
            <dd className="text-right font-mono text-xs tabular-nums text-foreground">
              {row.v}
            </dd>
          </div>
        ))}
      </dl>

      {/* Fußzeile: PDF */}
      <footer className="border-t border-border bg-muted/30 px-5 py-3.5">
        {hasPdf ? (
          <a
            href={pdfUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-primary-strong transition-colors hover:text-primary"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Vollständiges PDF öffnen
            </span>
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : (
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            PDF auf Anfrage
          </p>
        )}
      </footer>
    </article>
  );
}
