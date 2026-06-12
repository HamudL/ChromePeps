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
      className="border-b border-primary/15 bg-primary/[0.04]"
    >
      <div className="container flex items-center justify-center gap-2.5 py-2 text-center">
        <FlaskConical
          className="h-3.5 w-3.5 shrink-0 text-primary"
          aria-hidden
        />
        <p className="font-mono text-[10.5px] uppercase leading-tight tracking-[0.14em]">
          <span className="font-semibold text-primary-strong">
            Nur für Forschungszwecke
          </span>
          <span aria-hidden className="mx-2.5 text-primary/40">
            {"//"}
          </span>
          <span className="text-muted-foreground">
            Nicht für menschlichen Verzehr oder therapeutische Anwendung
          </span>
        </p>
      </div>
    </div>
  );
}
