import type { ReactNode } from "react";

/**
 * Kompakter Shop-Header für /products und Kategorie-Landings. Bewusst
 * funktional gehalten wie ein echter Katalog-Kopf: Serif-H1 in einer
 * Farbe, eine sachliche Subline, darunter optional eine ruhige
 * Fakten-Zeile ("51 Chargen getestet · Ø 99,70 % Reinheit").
 *
 * Kein Akzentwort in Gold, kein Deko-Breadcrumb, keine Stats-Kacheln,
 * kein Featured-Slot — die Produkte direkt darunter sind der Inhalt.
 */

interface ApothekeShopHeroProps {
  title: ReactNode;
  subline?: string;
  /**
   * Kurze, echte Fakten (fertig formatiert), die mit "·" getrennt in
   * einer Zeile unter der Subline stehen. Leeres Array blendet die
   * Zeile aus.
   */
  facts?: string[];
}

export function ApothekeShopHero({
  title,
  subline,
  facts = [],
}: ApothekeShopHeroProps) {
  return (
    <section className="section-ink border-b border-ink-border">
      <div className="container py-10 md:py-14">
        <div className="max-w-3xl">
          <h1 className="font-serif text-[clamp(2.1rem,3.5vw,2.9rem)] font-medium tracking-[-0.02em] leading-[1.08] text-ink-foreground">
            {title}
          </h1>

          {subline && (
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
              {subline}
            </p>
          )}

          {facts.length > 0 && (
            <p className="mt-5 text-[13px] leading-relaxed text-ink-muted">
              {facts.map((fact, i) => (
                <span key={fact} className="whitespace-nowrap">
                  {i > 0 && (
                    <span aria-hidden className="mx-2.5">
                      ·
                    </span>
                  )}
                  {fact}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
