import type { ReactNode } from "react";
import { FeaturedProductCarousel } from "@/components/shop/featured-product-carousel";
import type { FeaturedProductData } from "@/lib/products/featured";

/**
 * Shop-Seitenkopf — kompakter, editorialer Protokoll-Kopf für /products
 * und Kategorie-Landings. Kein dunkles Hero-Theater mehr: helles Papier,
 * links Crumb (Mono) · Fraunces-Titel · Subline · Stat-Readouts · Mono-
 * Zähler; rechts optional die FeaturedProductCarousel als Ink-Einschub.
 * Abschluss: tick-rule (Mess-Lineal) über die volle Breite.
 *
 * Server Component ohne Interaktivität — der Carousel selbst ist
 * "use client" und übernimmt das Rotieren intern.
 *
 * Die Stats-Reihe ist flexibel — wenn keine echten Werte verfügbar sind
 * (z.B. noch keine COAs eingepflegt), wird sie automatisch ausgeblendet,
 * statt mit "0"-Zahlen zu werben.
 */

interface HeroStat {
  value: string;
  /**
   * Optionaler Suffix, der klein im Akzent neben dem Wert steht (z.B.
   * "%" bei Ø Reinheit). Wird nicht in die Tabular-Numerik eingerechnet.
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
  /**
   * Optionaler Mono-Zähler unter dem Kopf, z.B. "247 Produkte · 5
   * Kategorien". Bei undefined entfällt die Zeile.
   */
  counter?: string;
}

export function ApothekeShopHero({
  crumb,
  title,
  subline,
  stats,
  featured,
  counter,
}: ApothekeShopHeroProps) {
  const hasFeatured = featured.length > 0;

  return (
    <section className="hero-ambient relative border-b border-border bg-background">
      <div className="container relative pb-8 pt-10 md:pb-10 md:pt-14">
        <div
          className={`grid items-start gap-10 ${
            hasFeatured ? "lg:grid-cols-[1.15fr_0.85fr] lg:gap-14" : "lg:grid-cols-1"
          }`}
        >
          {/* Linke Spalte — Crumb, Titel, Subline, Readouts */}
          <div className="min-w-0">
            {crumb.length > 0 && (
              <nav
                aria-label="Breadcrumb"
                className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em]"
              >
                {crumb.map((segment, i) => (
                  <span key={`${segment}-${i}`} className="flex items-center gap-2">
                    <span
                      className={
                        i === 0
                          ? "font-semibold text-primary-strong"
                          : "text-muted-foreground"
                      }
                    >
                      {segment}
                    </span>
                    {i < crumb.length - 1 && (
                      <span aria-hidden className="text-muted-foreground/60">
                        /
                      </span>
                    )}
                  </span>
                ))}
              </nav>
            )}

            <h1 className="display-title text-[clamp(2.1rem,4.2vw,3.4rem)] text-foreground">
              {title}
            </h1>

            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              {subline}
            </p>

            {stats.length > 0 && (
              <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="min-w-0">
                    <dd className="stat-value text-[26px]">
                      {stat.value}
                      {stat.suffix && (
                        <span className="ml-0.5 text-sm font-semibold">
                          {stat.suffix}
                        </span>
                      )}
                    </dd>
                    <dt className="stat-key mt-1.5">{stat.label}</dt>
                  </div>
                ))}
              </dl>
            )}

            {counter && (
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                {counter}
              </p>
            )}
          </div>

          {/* Rechte Spalte — Featured-Produkt als Ink-Einschub (rotiert) */}
          {hasFeatured && (
            <div className="lg:pt-1.5">
              <FeaturedProductCarousel pool={featured} />
            </div>
          )}
        </div>

        {/* Mess-Lineal als Abschluss des Seitenkopfs */}
        <div aria-hidden className="tick-rule mt-8 md:mt-10" />
      </div>
    </section>
  );
}
