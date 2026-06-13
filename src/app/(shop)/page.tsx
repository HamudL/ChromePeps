// Bewusst force-dynamic: zur Build-Zeit gibt es keinen DATABASE_URL,
// daher würde ISR-Pre-Rendering scheitern. Stattdessen cachen wir
// die Daten-Helper unten mit Redis — Effekt ist derselbe (1 DB-Read
// pro N Sekunden statt pro Request) ohne Build-Time-Abhängigkeit.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import {
  productCardSelect,
  getBestsellerProductIds,
} from "@/lib/products/card";
import type { ProductCardData } from "@/types";

import { FadeUp } from "./home-animations";
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

/**
 * Signatur-Visual der Marke: ein stilisiertes Chromatogramm als
 * handgezeichnetes Inline-SVG — ruhige Basislinie, zwei kleine
 * Verunreinigungs-Hügel, EIN dominanter Hauptpeak. Bewusst schematisch
 * (kein echter Messexport) und als solches beschriftet; die echten
 * Werte stehen in der LiveMetrics-Sektion und auf den CoA-Seiten.
 */
function ChromatogramPanel() {
  return (
    <figure className="card-ink relative overflow-hidden rounded-lg border border-ink-border bg-ink text-ink-foreground">
      <div className="absolute inset-0 apo-grid opacity-50" aria-hidden />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="mono-tag text-ink-muted">Protokoll · HPLC-UV</span>
          <span className="mono-tag text-ink-muted">ChromePeps · Signatur</span>
        </div>
        <div className="tick-rule mt-3" aria-hidden />

        {/* Dekoratives SVG — die Aussage trägt die figcaption + sr-only. */}
        <svg
          viewBox="0 0 460 230"
          className="mt-5 w-full"
          aria-hidden="true"
          focusable="false"
        >
          {/* Raster-Hilfslinien */}
          <g stroke="hsl(var(--ink-border))" strokeWidth="1" opacity="0.7">
            <line x1="30" y1="60" x2="450" y2="60" />
            <line x1="30" y1="101" x2="450" y2="101" />
            <line x1="30" y1="142" x2="450" y2="142" />
          </g>
          {/* Achsen */}
          <g stroke="hsl(var(--ink-muted))" strokeWidth="1" opacity="0.55">
            <line x1="30" y1="18" x2="30" y2="184" />
            <line x1="30" y1="184" x2="450" y2="184" />
            <line x1="30" y1="184" x2="30" y2="189" />
            <line x1="114" y1="184" x2="114" y2="189" />
            <line x1="198" y1="184" x2="198" y2="189" />
            <line x1="282" y1="184" x2="282" y2="189" />
            <line x1="366" y1="184" x2="366" y2="189" />
            <line x1="450" y1="184" x2="450" y2="189" />
          </g>
          {/* Mono-Achsenbeschriftung */}
          <g
            className="font-mono"
            fontSize="9"
            fill="hsl(var(--ink-muted))"
            letterSpacing="0.08em"
          >
            <text x="30" y="202" textAnchor="middle">0</text>
            <text x="114" y="202" textAnchor="middle">2</text>
            <text x="198" y="202" textAnchor="middle">4</text>
            <text x="282" y="202" textAnchor="middle">6</text>
            <text x="366" y="202" textAnchor="middle">8</text>
            <text x="450" y="202" textAnchor="middle">10</text>
            <text x="450" y="218" textAnchor="end">t [min]</text>
            <text x="36" y="14">mAU</text>
          </g>
          {/* Fläche unter dem Hauptpeak */}
          <path
            d="M 256 183.6 C 270 183.6 280 180 288 152 C 294 126 298 70 303 56 C 305.5 49 307.5 49 310 56 C 315 70 319 126 325 152 C 333 180 343 183.6 357 183.7 L 357 184 L 256 184 Z"
            fill="hsl(var(--primary) / 0.16)"
          />
          {/* Messkurve: Basislinie mit leichtem Rauschen, zwei kleinen
              Nebensignalen und dem dominanten Hauptpeak bei ~6,6 min. */}
          <path
            d="M 30 184 C 48 183.2 62 183.8 76 183.4 C 88 183 96 181.6 104 178.4 C 110 175.8 114 173.6 118 176.2 C 123 179.4 130 183.4 142 183.6 C 156 183.8 164 181.4 172 180 C 178 179 184 182 192 183.2 C 208 184 228 183.4 256 183.6 C 270 183.6 280 180 288 152 C 294 126 298 70 303 56 C 305.5 49 307.5 49 310 56 C 315 70 319 126 325 152 C 333 180 343 183.6 357 183.7 C 389 184 421 183.5 450 183.8"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Retentions-Annotation am Hauptpeak */}
          <line
            x1="306"
            y1="46"
            x2="306"
            y2="32"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.8"
          />
          <text
            x="306"
            y="24"
            textAnchor="middle"
            className="font-mono"
            fontSize="9"
            fill="hsl(var(--primary))"
            letterSpacing="0.08em"
          >
            tR 6,6 min
          </text>
        </svg>

        <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="mono-label text-primary">Hauptpeak ≥ 99 %</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
            UV 220 nm · schematisch
          </span>
        </figcaption>
        <span className="sr-only">
          Stilisiertes Chromatogramm: ruhige Basislinie mit einem dominanten
          Hauptpeak — steht für eine gemessene Reinheit von mindestens 99
          Prozent.
        </span>
      </div>
    </figure>
  );
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

  // Drei belegbare Versprechen — als nummerierte Protokoll-Einträge.
  const versprechen = [
    {
      index: "01",
      title: "Drittlabor-geprüft",
      desc: "Jede Charge wird durch Janoshik unabhängig per HPLC auf Reinheit getestet — vor der Freigabe, ohne Ausnahme.",
      link: "/qualitaetskontrolle",
      linkText: "Qualitätskontrolle",
    },
    {
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
      index: "03",
      title: "CoA zu jeder Bestellung",
      desc: "Das passende Analysezertifikat erhalten Sie automatisch per E-Mail mit Ihrer Bestellung — verifizierbar auf janoshik.com.",
      link: "/qualitaetskontrolle",
      linkText: "Qualitätskontrolle",
    },
  ];

  // Vier Schritte als Markierungen auf einer Mess-Strecke.
  const prozessSchritte = [
    {
      n: "01",
      title: "Chargen-Handling",
      desc: "Lagerung bei -24°C mit eindeutiger Lot-Nummer.",
      meta: "−24 °C · Lot",
    },
    {
      n: "02",
      title: "Janoshik-Test",
      desc: "HPLC-Analyse durch ein unabhängiges Drittlabor.",
      meta: "HPLC · UV 220 nm",
    },
    {
      n: "03",
      title: "Qualitätskontrolle",
      desc: "Nur Chargen, die alle Tests bestehen, werden freigegeben.",
      meta: "Freigabe · dokumentiert",
    },
    {
      n: "04",
      title: "Online verifizierbar",
      desc: "Ergebnisse öffentlich einsehbar auf janoshik.com.",
      meta: "janoshik.com",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* ── Hero — editorial-asymmetrisch: Statement links, Analyse-Panel
          rechts, darunter die Mess-Zeile mit Instrument-Readouts. ── */}
      <section
        className="relative hero-ambient overflow-hidden"
        aria-labelledby="hero-heading"
      >
        <div className="absolute inset-0 subtle-grid opacity-30" aria-hidden />
        <div className="container relative pb-12 pt-16 md:pb-16 md:pt-24 lg:pt-28">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-12">
            <FadeUp className="flex flex-col items-start gap-6 lg:col-span-7">
              <span className="eyebrow">
                Research-Use-Only · Janoshik-verifiziert · Est. 2026
              </span>

              <h1
                id="hero-heading"
                className="display-title text-[clamp(2.5rem,6.5vw,4.5rem)]"
              >
                ChromePeps — Forschungspeptide, <em>gemessen,</em> nicht
                versprochen.
              </h1>

              <p className="max-w-xl text-lg text-muted-foreground md:text-xl">
                Unabhängig per HPLC geprüfte Reinheit. Jede Charge mit
                Lot-Nummer und Analysezertifikat von Janoshik Labs —
                öffentlich verifizierbar.
              </p>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
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
            </FadeUp>

            <FadeUp delay={0.12} className="lg:col-span-5">
              <ChromatogramPanel />
            </FadeUp>
          </div>

          {/* Mess-Zeile: statische Instrument-Readouts (keine fabrizierten
              Metriken — die echten Zahlen stehen in der LiveMetrics-
              Sektion). Tick-Rule als Mess-Lineal, Werte linksbündig. */}
          <FadeUp delay={0.2} className="mt-14 md:mt-16">
            <div className="tick-rule" aria-hidden />
            <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
              <div>
                <dt className="stat-key">Analyse-Methode</dt>
                <dd className="stat-value mt-2 text-2xl md:text-3xl">
                  HPLC · UV 220 nm
                </dd>
              </div>
              <div>
                <dt className="stat-key">3rd-Party verifiziert</dt>
                <dd className="stat-value mt-2 text-2xl md:text-3xl">100 %</dd>
              </div>
              <div>
                <dt className="stat-key">Chargen-Lagerung</dt>
                <dd className="stat-value mt-2 text-2xl md:text-3xl">−24 °C</dd>
              </div>
            </dl>
          </FadeUp>
        </div>
      </section>

      {/* ── Live Metrics — Readout-Band mit echten Zahlen aus der DB. Wenn
          noch keine COAs vorhanden sind, wird die Section ausgeblendet
          statt mit 0-Werten zu werben. ── */}
      {liveMetricsTiles.length > 0 && (
        <LiveMetrics metrics={liveMetricsTiles} />
      )}

      {/* ── Übergang hell → dunkel (Progressive Blur) ── */}
      <SectionBlur />

      {/* ── Warum ChromePeps? (ink) — drei nummerierte Protokoll-Einträge,
          versetzt statt symmetrischem Karten-Grid. ── */}
      <section
        className="section-ink relative grain-overlay"
        aria-labelledby="warum-heading"
      >
        <div className="absolute inset-0 apo-grid opacity-60" aria-hidden />
        <div className="container relative section-pad">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
            <FadeUp className="lg:col-span-4">
              <span className="eyebrow">Warum ChromePeps</span>
              <h2
                id="warum-heading"
                className="display-title mt-4 text-3xl md:text-4xl"
              >
                Drei Versprechen, die wir <em>belegen</em> können.
              </h2>
              <p className="mt-4 max-w-prose text-ink-muted">
                Kein Marketing-Vokabular, sondern überprüfbare Standards — vom
                unabhängigen Labortest bis zum Zertifikat in Ihrem Postfach.
              </p>
            </FadeUp>

            <ol className="border-b border-ink-border lg:col-span-8">
              {versprechen.map((eintrag, i) => (
                <FadeUp
                  as="li"
                  key={eintrag.title}
                  delay={i * 0.08}
                  // Zunehmender Einzug ab lg — versetzte Protokoll-Liste
                  // statt symmetrischer Karten.
                  className={`grid grid-cols-[3.5rem_1fr] gap-x-5 border-t border-ink-border py-7 md:grid-cols-[5rem_1fr_auto] md:items-baseline md:gap-x-8 md:py-8 ${
                    ["", "lg:pl-12", "lg:pl-24"][i]
                  }`}
                >
                  <span aria-hidden className="index-ghost text-4xl md:text-5xl">
                    {eintrag.index}
                  </span>
                  <div>
                    <h3 className="display-title text-xl md:text-2xl">
                      {eintrag.title}
                    </h3>
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
                      {eintrag.desc}
                    </p>
                  </div>
                  <Link
                    href={eintrag.link}
                    className="mono-label col-start-2 mt-4 inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary-strong md:col-start-auto md:mt-0"
                  >
                    {eintrag.linkText}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </FadeUp>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Trust Bar (ink) — interaktive Specimen-Tags mit Evidence-
          Tooltips. Direkt im Anschluss an "Warum ChromePeps?" (auch ink),
          damit die Vertrauens-Signale thematisch zusammenbleiben. ── */}
      <TrustBar />

      {/* ── Übergang dunkel → hell (Progressive Blur) ── */}
      <SectionBlur />

      {/* ── Qualitätsprozess (light) — vier Schritte als Markierungen auf
          einer horizontalen Mess-Strecke (Mobile: vertikale Achse). ── */}
      <section className="container section-pad" aria-labelledby="prozess-heading">
        <FadeUp>
          <span className="eyebrow">Qualitätsprozess</span>
          <h2
            id="prozess-heading"
            className="display-title mt-4 max-w-2xl text-3xl md:text-4xl lg:text-5xl"
          >
            Vom Wareneingang zum Etikett — in <em>vier verifizierten</em>{" "}
            Schritten.
          </h2>
          <p className="mt-4 max-w-prose text-muted-foreground">
            Keine Abkürzungen, keine „Sonderchargen“. Jeder Schritt ist
            dokumentiert und nachvollziehbar.
          </p>
        </FadeUp>

        <div className="mt-14">
          {/* Die Mess-Achse: tick-rule horizontal (Desktop) … */}
          <div className="tick-rule hidden md:block" aria-hidden />
          {/* … bzw. vertikale Haarlinie links (Mobile). */}
          <ol className="grid grid-cols-1 gap-y-10 border-l border-border pl-6 md:mt-8 md:grid-cols-4 md:gap-x-8 md:gap-y-0 md:border-l-0 md:pl-0">
            {prozessSchritte.map((schritt, i) => (
              <FadeUp as="li" key={schritt.n} delay={i * 0.08} className="relative">
                {/* Markierung auf der Achse: horizontaler Strich (Mobile),
                    vertikaler Strich hoch zur tick-rule (Desktop). */}
                <span
                  aria-hidden
                  className="absolute -left-6 top-2 h-px w-4 bg-primary md:hidden"
                />
                <span
                  aria-hidden
                  className="absolute -top-8 left-0 hidden h-8 w-px bg-primary md:block"
                />
                <span className="mono-label text-primary-strong">{schritt.n}</span>
                <h3 className="mt-3 font-semibold">{schritt.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {schritt.desc}
                </p>
                <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/70">
                  {schritt.meta}
                </p>
              </FadeUp>
            ))}
          </ol>
        </div>

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

      {/* ── Kategorien — editoriale Index-Liste statt Bilder-Karten-Grid:
          Ghost-Index, Fraunces-Titel mit Hover-Underline, Produkt-Count
          in Mono. ── */}
      {categories.length > 0 && (
        <section className="container section-pad" aria-labelledby="sortiment-heading">
          {/* Trenner zwischen zwei hellen Sektionen (Qualitätsprozess →
              Kategorien) — editorialer als border-t. */}
          <hr className="rule-gold mb-14" />
          <FadeUp>
            <span className="eyebrow">Sortiment</span>
            <h2
              id="sortiment-heading"
              className="display-title mt-4 max-w-2xl text-3xl md:text-4xl lg:text-5xl"
            >
              Nach Kategorie <em>erkunden.</em>
            </h2>
          </FadeUp>

          <ul className="mt-10 border-b border-border">
            {categories.map((cat, i) => (
              <FadeUp as="li" key={cat.id} delay={i * 0.06}>
                <Link
                  href={`/products/category/${cat.slug}`}
                  className="group grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-4 border-t border-border py-6 md:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,20rem)_auto] md:gap-x-8 md:py-8"
                >
                  <span aria-hidden className="index-ghost text-3xl md:text-5xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="gold-underline justify-self-start display-title text-2xl md:text-3xl">
                    {cat.name}
                  </h3>
                  {/* Beschreibung nur ab md — die Zeile bleibt auf Mobile
                      eine kompakte Index-Zeile. */}
                  <p className="hidden truncate text-sm text-muted-foreground md:block">
                    {cat.description ?? ""}
                  </p>
                  <span className="flex items-center gap-4 justify-self-end">
                    <span className="mono-label whitespace-nowrap text-muted-foreground">
                      {cat._count.products}{" "}
                      {cat._count.products === 1 ? "Produkt" : "Produkte"}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary-strong"
                      aria-hidden
                    />
                  </span>
                </Link>
              </FadeUp>
            ))}
          </ul>
        </section>
      )}

      {/* ── Bestseller (light — die ProductCard ist hell) ── */}
      {bestsellers.length > 0 && (
        <section className="container section-pad" aria-labelledby="bestseller-heading">
          <hr className="rule-gold mb-14" />
          <FadeUp>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <span className="eyebrow">Bestseller</span>
                <h2
                  id="bestseller-heading"
                  className="display-title mt-4 text-3xl md:text-4xl lg:text-5xl"
                >
                  Was unsere Forscher am häufigsten <em>bestellen.</em>
                </h2>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden shrink-0 sm:inline-flex"
              >
                <Link href="/products">
                  Alle Produkte <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </FadeUp>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {bestsellers.map((product, i) => (
              <FadeUp key={product.id} delay={i * 0.08}>
                <ProductCard product={product} />
              </FadeUp>
            ))}
          </div>

          <div className="mt-10 sm:hidden">
            <Button asChild variant="outline" className="w-full">
              <Link href="/products">Alle Produkte</Link>
            </Button>
          </div>
        </section>
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
