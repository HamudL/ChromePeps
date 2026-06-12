// Bewusst force-dynamic: zur Build-Zeit gibt es keinen DATABASE_URL,
// daher würde ISR-Pre-Rendering scheitern. Stattdessen cachen wir
// die Daten-Helper unten mit Redis — Effekt ist derselbe (1 DB-Read
// pro N Sekunden statt pro Request) ohne Build-Time-Abhängigkeit.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  FlaskConical,
  ShieldCheck,
  CreditCard,
  Eye,
  Mail,
  Microscope,
  Package,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  RESEARCH_DISCLAIMER,
  HOMEPAGE_CACHE,
  HOMEPAGE_CACHE_TTL,
  BANK_TRANSFER_ENABLED,
} from "@/lib/constants";
import { cacheGet, cacheSet } from "@/lib/redis";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  productCardSelect,
  getBestsellerProductIds,
} from "@/lib/products/card";
import type { ProductCardData } from "@/types";

import { FadeUp } from "./home-animations";
import { HeroLogo } from "./hero-logo";
import { PeptideNetwork } from "@/components/shop/peptide-network";
import { TrustBar } from "@/components/shop/trust-bar";
import { LiveMetrics } from "@/components/shop/live-metrics";
import { RecentlyViewed } from "@/components/shop/recently-viewed";
import { SectionBlur } from "@/components/layout/section-blur";

// Title/Description erben vom Root-Layout — hier nur das Canonical der
// Startseite (das Root-Layout setzt bewusst KEIN globales canonical).
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

async function getBestsellers(): Promise<ProductCardData[]> {
  const cached = await cacheGet<ProductCardData[]>(HOMEPAGE_CACHE.BESTSELLERS);
  if (cached) return cached;

  const [products, bestsellerIds] = await Promise.all([
    db.product.findMany({
      where: { isActive: true, isBestseller: true },
      // Admin-Sortierung respektieren, sonst neueste zuerst.
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 4,
      select: productCardSelect,
    }),
    getBestsellerProductIds(),
  ]);
  const result = products.map((p) => ({
    ...p,
    isBestseller: bestsellerIds.has(p.id),
  }));
  await cacheSet(
    HOMEPAGE_CACHE.BESTSELLERS,
    result,
    HOMEPAGE_CACHE_TTL.BESTSELLERS,
  );
  return result;
}

type HomepageCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  _count: { products: number };
};

async function getCategories(): Promise<HomepageCategory[]> {
  const cached = await cacheGet<HomepageCategory[]>(HOMEPAGE_CACHE.CATEGORIES);
  if (cached) return cached;

  const result = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
  await cacheSet(
    HOMEPAGE_CACHE.CATEGORIES,
    result,
    HOMEPAGE_CACHE_TTL.CATEGORIES,
  );
  return result;
}

/**
 * Zahlen für den LiveMetrics-Block: getestete Chargen (alle veröffentlichten
 * COAs) und Ø Reinheit der letzten 12 Monate (nur COAs mit purity-Wert).
 * Die "Ausgelieferte Bestellungen"-Kachel aus dem ursprünglichen Design ist
 * bewusst weggelassen — sie gehört inhaltlich nicht auf die Startseite.
 */
type LiveMetricsResult = { batchCount: number; avgPurity: number | null };

async function getLiveMetrics(): Promise<LiveMetricsResult> {
  const cached = await cacheGet<LiveMetricsResult>(HOMEPAGE_CACHE.METRICS);
  if (cached) return cached;

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [batchCount, avgPurity] = await Promise.all([
    db.certificateOfAnalysis.count({ where: { isPublished: true } }),
    db.certificateOfAnalysis.aggregate({
      where: {
        isPublished: true,
        purity: { not: null },
        testDate: { gte: twelveMonthsAgo },
      },
      _avg: { purity: true },
    }),
  ]);

  const result: LiveMetricsResult = {
    batchCount,
    avgPurity: avgPurity._avg.purity ?? null,
  };
  await cacheSet(HOMEPAGE_CACHE.METRICS, result, HOMEPAGE_CACHE_TTL.METRICS);
  return result;
}

export default async function HomePage() {
  // Promise.allSettled statt Promise.all: ein Failure (z. B. Redis-Down,
  // Postgres-Query timeout auf der Aggregate-Query) darf die Homepage
  // nicht komplett killen — Best-effort-Render mit den verfügbaren
  // Sektionen statt 500-Page. Siehe Handoff "Promise.all koppelt
  // Failures".
  const [bestsellersResult, categoriesResult, liveMetricsResult] =
    await Promise.allSettled([
      getBestsellers(),
      getCategories(),
      getLiveMetrics(),
    ]);
  const bestsellers: ProductCardData[] =
    bestsellersResult.status === "fulfilled" ? bestsellersResult.value : [];
  const categories: HomepageCategory[] =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const liveMetrics: LiveMetricsResult =
    liveMetricsResult.status === "fulfilled"
      ? liveMetricsResult.value
      : { batchCount: 0, avgPurity: null };
  if (bestsellersResult.status === "rejected") {
    console.error("[home] bestsellers failed", bestsellersResult.reason);
  }
  if (categoriesResult.status === "rejected") {
    console.error("[home] categories failed", categoriesResult.reason);
  }
  if (liveMetricsResult.status === "rejected") {
    console.error("[home] live-metrics failed", liveMetricsResult.reason);
  }

  // Metrics-Kacheln mit echten Zahlen befüllen. Zahlen <= 0 bzw. null
  // (z.B. noch keine COA eingepflegt) werden nicht als "0 Chargen getestet"
  // angezeigt — wir blenden die jeweilige Kachel dann aus und lassen nur
  // die sinnvollen Werte stehen.
  const metricsYear = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
  });
  const liveMetricsTiles: Array<{
    target: number;
    suffix?: string;
    decimals?: number;
    label: string;
    sub?: string;
  }> = [];
  if (liveMetrics.batchCount > 0) {
    liveMetricsTiles.push({
      target: liveMetrics.batchCount,
      label: "Chargen · getestet",
      sub: `Stand ${metricsYear}`,
    });
  }
  if (liveMetrics.avgPurity != null) {
    liveMetricsTiles.push({
      target: Number(liveMetrics.avgPurity.toFixed(2)),
      suffix: "%",
      decimals: 2,
      label: "Ø Reinheit · 12 Monate",
      sub: "HPLC · Janoshik Labs",
    });
  }

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative hero-ambient overflow-hidden" aria-label="Hero">
        <div className="absolute inset-0 subtle-grid opacity-30" />
        <PeptideNetwork />
        {/* Soft radial vignette keeps the text legible over the particle network */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{
            background:
              "radial-gradient(620px 360px at 50% 50%, hsl(var(--background) / 0.85), transparent 70%)",
          }}
        />
        <div className="container relative py-24 md:py-32 lg:py-40">
          <FadeUp>
            <div className="mx-auto max-w-3xl text-center flex flex-col items-center gap-7">
              <span className="eyebrow">
                Research-Use-Only · Janoshik-verifiziert · Est. 2026
              </span>

              <HeroLogo />

              <p className="text-lg md:text-xl text-muted-foreground max-w-xl text-balance">
                Forschungspeptide mit unabhängig per HPLC geprüfter Reinheit.
                Jede Charge mit Lot-Nummer und Analysezertifikat — gemessen,
                nicht versprochen.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <Button asChild variant="gold" size="xl">
                  <Link href="/products">
                    Zum Shop
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="ink" size="xl">
                  <Link href="/qualitaetskontrolle">Qualitätskontrolle</Link>
                </Button>
              </div>

              {/* Instrument-Readout: statische Vertrauens-Fakten (keine
                  fabrizierten Metriken — die echten Zahlen stehen in der
                  LiveMetrics-Sektion). Mono-Präzision direkt unter dem Hero. */}
              <dl className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 border-t border-border/70 pt-7">
                <div className="text-center">
                  <dt className="stat-value text-2xl md:text-3xl">HPLC</dt>
                  <dd className="stat-key mt-1.5">UV · 220 nm</dd>
                </div>
                <div aria-hidden className="hidden h-8 w-px bg-border sm:block" />
                <div className="text-center">
                  <dt className="stat-value text-2xl md:text-3xl">100 %</dt>
                  <dd className="stat-key mt-1.5">3rd-Party verifiziert</dd>
                </div>
                <div aria-hidden className="hidden h-8 w-px bg-border sm:block" />
                <div className="text-center">
                  <dt className="stat-value text-2xl md:text-3xl">−24 °C</dt>
                  <dd className="stat-key mt-1.5">Charge gelagert</dd>
                </div>
              </dl>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Live Metrics (light) — echte Zahlen aus DB. Wenn noch keine
          COAs/Orders vorhanden sind, wird die Section ausgeblendet statt
          mit 0-Werten zu werben. ── */}
      {liveMetricsTiles.length > 0 && (
        <LiveMetrics metrics={liveMetricsTiles} />
      )}

      {/* ── Übergang hell → dunkel (Progressive Blur) ── */}
      <SectionBlur />

      {/* ── Warum ChromePeps? (ink) ── */}
      <section className="section-ink relative grain-overlay">
        <div className="absolute inset-0 apo-grid opacity-60" aria-hidden />
        <div className="container relative section-pad">
          <FadeUp className="max-w-2xl">
            <span className="eyebrow">Warum ChromePeps</span>
            <h2 className="display-title mt-4 text-3xl md:text-4xl lg:text-5xl">
              Drei Versprechen, die wir belegen können.
            </h2>
            <p className="mt-4 max-w-prose text-ink-muted">
              Kein Marketing-Vokabular, sondern überprüfbare Standards — vom
              unabhängigen Labortest bis zum Zertifikat in Ihrem Postfach.
            </p>
          </FadeUp>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-px overflow-hidden rounded-xl border border-ink-border bg-ink-border/60">
            {[
              {
                icon: Microscope,
                index: "01",
                title: "Drittlabor-geprüft",
                desc: "Jede Charge wird durch Janoshik unabhängig per HPLC auf Reinheit getestet — vor der Freigabe, ohne Ausnahme.",
                link: "/qualitaetskontrolle",
                linkText: "Qualitätskontrolle",
              },
              {
                icon: CreditCard,
                index: "02",
                title: "Sichere Zahlung",
                // Zahlarten-Aufzählung MUSS dem Vorkasse-Schalter folgen —
                // eine beworbene, im Checkout aber nicht angebotene
                // Zahlungsart ist irreführend (abmahnfähig).
                desc: BANK_TRANSFER_ENABLED
                  ? "Stripe, Apple Pay, Google Pay oder Banküberweisung — verschlüsselt, ohne dass Kartendaten bei uns liegen."
                  : "Stripe, Apple Pay oder Google Pay — verschlüsselt, ohne dass Kartendaten bei uns liegen.",
                link: "/zahlung",
                linkText: "Zahlungsoptionen",
              },
              {
                icon: Mail,
                index: "03",
                title: "CoA zu jeder Bestellung",
                desc: "Das passende Analysezertifikat erhalten Sie automatisch per E-Mail mit Ihrer Bestellung — verifizierbar auf janoshik.com.",
                link: "/qualitaetskontrolle",
                linkText: "Qualitätskontrolle",
              },
            ].map((card, i) => (
              <FadeUp
                key={card.title}
                delay={i * 0.08}
                className="group flex h-full flex-col bg-ink p-7 transition-colors hover:bg-[hsl(20_14%_6%)]"
              >
                <div className="flex items-center justify-between">
                  <card.icon className="h-7 w-7 text-primary" strokeWidth={1.6} />
                  <span className="mono-tag text-ink-muted">{card.index}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                  {card.desc}
                </p>
                <Link
                  href={card.link}
                  className="mono-label mt-5 inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
                >
                  {card.linkText}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Bar (dark) — interaktive Pills mit Evidence-Tooltips.
          Platziert direkt im Anschluss an "Warum ChromePeps?" (auch
          dark), damit die Vertrauens-Signale thematisch zusammenbleiben
          und der Light/Dark-Rhythmus nicht gebrochen wird. ── */}
      <TrustBar />

      {/* ── Übergang dunkel → hell (Progressive Blur) ── */}
      <SectionBlur />

      {/* ── Qualitätsprozess (light) ── */}
      <section className="container section-pad">
        <FadeUp>
          <span className="eyebrow">Qualitätsprozess</span>
          <h2 className="display-title mt-4 max-w-2xl text-3xl md:text-4xl lg:text-5xl">
            Vom Wareneingang zum Etikett — in vier verifizierten Schritten.
          </h2>
          <p className="mt-4 max-w-prose text-muted-foreground">
            Keine Abkürzungen, keine „Sonderchargen“. Jeder Schritt ist
            dokumentiert und nachvollziehbar.
          </p>
        </FadeUp>

        <ol className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Package, n: "01", title: "Chargen-Handling", desc: "Lagerung bei -24\u00B0C mit eindeutiger Lot-Nummer." },
            { icon: Microscope, n: "02", title: "Janoshik-Test", desc: "HPLC-Analyse durch ein unabhängiges Drittlabor." },
            { icon: ShieldCheck, n: "03", title: "Qualitätskontrolle", desc: "Nur Chargen, die alle Tests bestehen, werden freigegeben." },
            { icon: Eye, n: "04", title: "Online verifizierbar", desc: "Ergebnisse öffentlich einsehbar auf janoshik.com." },
          ].map((step, i) => (
            <FadeUp
              key={step.n}
              as="li"
              delay={i * 0.08}
              className="relative border-t border-border pt-6"
            >
              <span
                aria-hidden
                className="absolute -top-px left-0 h-px w-12 bg-primary"
              />
              <div className="flex items-center justify-between">
                <step.icon className="h-7 w-7 text-primary-strong" strokeWidth={1.6} />
                <span className="stat-value text-3xl text-primary/25">
                  {step.n}
                </span>
              </div>
              <h3 className="mt-5 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.desc}
              </p>
            </FadeUp>
          ))}
        </ol>

        <FadeUp delay={0.32}>
          <div className="mt-12">
            <Button asChild variant="outline">
              <Link href="/qualitaetskontrolle">
                So testen wir
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </FadeUp>
      </section>

      {/* ── Kategorien ── */}
      {categories.length > 0 && (
        <section className="container section-pad">
          {/* Trenner zwischen zwei hellen Sektionen (Qualitätsprozess →
              Kategorien) — editorialer als border-t. */}
          <hr className="rule-gold mb-16" />
          <FadeUp>
            <span className="eyebrow">Sortiment</span>
            <h2 className="display-title mt-4 max-w-2xl text-3xl md:text-4xl lg:text-5xl">
              Nach Kategorie erkunden.
            </h2>
          </FadeUp>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, i) => (
              <FadeUp key={cat.id} delay={i * 0.08}>
                <Link
                  href={`/products/category/${cat.slug}`}
                  className="group block h-full"
                >
                  <Card
                    variant="lift"
                    className="h-full cursor-pointer overflow-hidden"
                  >
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {cat.image ? (
                        <Image
                          src={cat.image}
                          alt={cat.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <FlaskConical className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <span className="absolute left-4 top-4 trust-pill bg-background/85 backdrop-blur">
                        {cat._count.products}{" "}
                        {cat._count.products === 1 ? "Produkt" : "Produkte"}
                      </span>
                    </div>
                    <CardContent className="flex items-center justify-between p-5">
                      <h3 className="gold-underline text-lg font-semibold">
                        {cat.name}
                      </h3>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
                    </CardContent>
                  </Card>
                </Link>
              </FadeUp>
            ))}
          </div>
        </section>
      )}

      {/* ── Bestseller ── */}
      {bestsellers.length > 0 && (
        <>
        {/* ── Übergang hell → dunkel (Progressive Blur) ── */}
        <SectionBlur />
        <section className="section-ink relative grain-overlay">
          <div className="absolute inset-0 apo-grid opacity-50" aria-hidden />
          <div className="container relative section-pad">
            <FadeUp>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-xl">
                  <span className="eyebrow">Bestseller</span>
                  <h2 className="display-title mt-4 text-3xl md:text-4xl lg:text-5xl">
                    Was unsere Forscher am häufigsten bestellen.
                  </h2>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="hidden shrink-0 border-ink-border bg-transparent text-ink-foreground hover:bg-white/10 hover:text-ink-foreground sm:inline-flex"
                >
                  <Link href="/products">
                    Alle Produkte <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </FadeUp>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestsellers.map((product, i) => (
                <FadeUp key={product.id} delay={i * 0.08}>
                  <ProductCard product={product} />
                </FadeUp>
              ))}
            </div>

            <div className="mt-10 text-center sm:hidden">
              <Button
                asChild
                variant="outline"
                className="border-ink-border bg-transparent text-ink-foreground hover:bg-white/10 hover:text-ink-foreground"
              >
                <Link href="/products">Alle Produkte</Link>
              </Button>
            </div>
          </div>
        </section>
        {/* ── Übergang dunkel → hell (Progressive Blur) ── */}
        <SectionBlur />
        </>
      )}

      {/* ── Zuletzt angesehen (client-island, blendet sich bei leerem
          Store / SSR selbst aus) ── */}
      <RecentlyViewed />

      {/* ── Disclaimer ── */}
      <section className="container">
        <hr className="rule-gold" />
        <div className="mx-auto max-w-2xl py-10 text-center">
          <span className="mono-label text-muted-foreground/70">
            Research-Use-Only
          </span>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground/60">
            {RESEARCH_DISCLAIMER}
          </p>
        </div>
      </section>
    </div>
  );
}
