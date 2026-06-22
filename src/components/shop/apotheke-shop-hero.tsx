import type { ReactNode } from "react";
import { FeaturedProductCarousel } from "@/components/shop/featured-product-carousel";
import type { FeaturedProductData } from "@/lib/products/featured";

/**
 * Apotheke-Hero — dunkles Top-Band für /products, Kategorie-Landings und
 * (optional) Produktdetail. Links: Crumb · H1 (Fraunces-italic-Akzent
 * auf einem Wort möglich) · Subline · Stats-Reihe. Rechts: optionale
 * FeaturedProductCarousel (rotiert alle 20s zufällig durch den Pool).
 * Server Component ohne Interaktivität — der Carousel selbst ist
 * "use client" und übernimmt das Rotieren intern.
 *
 * Die Stats-Reihe ist flexibel — wenn weniger als 2 echte Werte
 * verfügbar sind (z.B. noch keine COAs eingepflegt), wird sie
 * automatisch ausgeblendet, statt mit "0"-Zahlen zu werben.
 */

interface HeroStat {
  value: string;
  /**
   * Optionaler Suffix, der in gold/klein neben dem Wert steht (z.B. "%"
   * bei Ø Reinheit). Wird nicht in die Tabular-Numerik eingerechnet.
   */
  suffix?: string;
  label: string;
}

interface ApothekeShopHeroProps {
  crumb: string[];
  title: ReactNode;
  subline: string;
  stats: HeroStat[];
  /**
   * Pool von Featured-Produkten. Bei `length === 0` wird kein Featured-
   * Slot gerendert (Layout fällt auf eine Spalte zurück). Bei `length === 1`
   * zeigt der Carousel statisch dieses eine Produkt. Bei mehr rotiert er.
   */
  featured: FeaturedProductData[];
}

export function ApothekeShopHero({
  crumb,
  title,
  subline,
  stats,
  featured,
}: ApothekeShopHeroProps) {
  return (
    <section className="section-ink relative overflow-hidden border-b border-ink-border">
      {/* Feines Grid-Muster im Hintergrund — typische Labor-Formular-Optik. */}
      <div aria-hidden className="absolute inset-0 apo-grid pointer-events-none" />

      <div className="container relative py-16 md:py-20 lg:py-24">
        <div
          className={`grid gap-10 lg:gap-16 ${
            featured.length > 0 ? "lg:grid-cols-[1.2fr_1fr]" : "lg:grid-cols-1"
          }`}
        >
          {/* Left column — Text + Stats */}
          <div>
            {crumb.length > 0 && (
              <nav
                aria-label="Breadcrumb"
                className="mb-7 flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-primary"
              >
                {crumb.map((segment, i) => (
                  <span key={`${segment}-${i}`} className="flex items-center gap-2">
                    <span className={i === 0 ? "text-primary" : "text-ink-muted"}>
                      {segment}
                    </span>
                    {i < crumb.length - 1 && (
                      <span className="text-ink-muted">/</span>
                    )}
                  </span>
                ))}
              </nav>
            )}

            <h1 className="text-[clamp(2.5rem,5vw,4.2rem)] font-semibold tracking-[-0.035em] leading-[1] text-ink-foreground">
              {title}
            </h1>

            <p className="mt-5 text-base leading-relaxed text-ink-muted max-w-lg">
              {subline}
            </p>

            {stats.length > 0 && (
              <dl className="mt-8 pt-7 border-t border-ink-border flex flex-wrap gap-x-9 gap-y-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="min-w-0">
                    <dd className="text-[28px] font-semibold tracking-[-0.02em] tabular-nums text-ink-foreground leading-none">
                      {stat.value}
                      {stat.suffix && (
                        <span className="text-primary text-sm ml-0.5 font-semibold">
                          {stat.suffix}
                        </span>
                      )}
                    </dd>
                    <dt className="mt-1.5 font-mono text-[10px] tracking-[0.15em] uppercase text-ink-muted">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Right column — Featured Product (rotiert) */}
          {featured.length > 0 && (
            <div className="lg:pt-1">
              <FeaturedProductCarousel pool={featured} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
