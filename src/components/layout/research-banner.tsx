import { FlaskConical } from "lucide-react";

/**
 * ResearchBanner — dezenter, nicht schließbarer Disclaimer direkt unter
 * dem Header auf allen Customer-facing Layouts (Shop, Dashboard, Auth).
 * NICHT im Admin-Layout.
 *
 * Absicht:
 *  - rechtlich: der wichtigste Einzeiler ("Nur für Forschungszwecke")
 *    steht immer im Blickfeld, unabhängig davon ob der Nutzer den Footer-
 *    Disclaimer je gesehen hat.
 *  - visuell: passt zum Apotheke-Stil (goldener Primary-Akzent, schmaler
 *    heller Streifen mit feiner Unterlinie, Mono-Typo). Kein X-Button —
 *    der Disclaimer soll nicht wegklickbar sein.
 *
 * Static Server Component — kein JS, kein State.
 */
export function ResearchBanner() {
  return (
    <div
      role="note"
      aria-label="Forschungshinweis"
      className="border-b border-primary/20 bg-primary/5"
    >
      <div className="container flex items-center justify-center gap-2 py-2 text-center">
        <FlaskConical
          className="h-3.5 w-3.5 text-primary shrink-0"
          aria-hidden
        />
        <p className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-foreground/80 leading-tight">
          <span className="text-primary font-semibold">
            Nur für Forschungszwecke
          </span>
          <span className="mx-2 text-muted-foreground/60">·</span>
          <span className="text-muted-foreground">
            Nicht für menschlichen Verzehr oder therapeutische Anwendung
          </span>
        </p>
      </div>
    </div>
  );
}
