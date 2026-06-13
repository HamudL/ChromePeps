import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Truck, Mail, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { APP_NAME, RESEARCH_DISCLAIMER } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { productJsonLd, breadcrumbJsonLd, safeJsonLd } from "@/lib/json-ld";
import { ReviewSection } from "@/components/shop/review-section";
import { ReviewList, type ReviewListItem } from "@/components/shop/review-list";
import { StarRating } from "@/components/shop/star-rating";
import { ProductCard } from "@/components/shop/product-card";
import { CertificateCard } from "@/components/shop/certificate-card";
import { Card } from "@/components/ui/card";
import { getRelatedProducts } from "@/lib/products/related";
import { getBestsellerProductIds } from "@/lib/products/card";
import type { Metadata } from "next";
import type { ProductWithDetails } from "@/types";

import {
  VariantBuyPanel,
  ImageGallery,
  SequenceCopyBlock,
} from "./product-client";
import { ProductViewTracker } from "@/components/shop/product-view-tracker";
import { RecentlyViewed } from "@/components/shop/recently-viewed";
import { SectionBlur } from "@/components/layout/section-blur";
import { FadeUp } from "../../home-animations";

// On-Demand-ISR: Seit der Header session-frei ist (Auth-Slot als
// Client-Island, siehe (shop)/layout.tsx), kann die PDP gecacht werden.
// generateStaticParams() => [] verschiebt das Rendering komplett auf
// die Laufzeit (der CI-Build hat keine DATABASE_URL!); der erste
// Request pro Slug rendert + cached.
// Frische-Vertrag: Bestandsänderungen aus Bestellungen/Refunds/Cancels
// invalidieren die PDP SOFORT (invalidateStockCaches ruft
// revalidatePath für diese Route), Admin-Produkt-Edits via
// revalidatePath in den Admin-Routen; das revalidate=60 ist nur das
// Sicherheitsnetz für alles Ungetriggerte.
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// Anzahl Reviews die initial mit dem Server-Render mitkommen. Mehr werden
// vom <ReviewList>-Client-Component per /api/reviews?offset=N nachgeladen.
// Default 20 schlägt einen guten Kompromiss: sieht "voll" aus auf einer
// frischen Page, aber 500-Reviews-Produkte liefern nicht mehrere MB JSON
// im SSR-Bundle.
const REVIEWS_INITIAL_TAKE = 20;

// React cache(): generateMetadata UND die Page rufen getProduct mit
// demselben Slug auf — ohne Memoisierung lief der schwerste Query der
// Seite (Product + Images + Variants + 20 Reviews) ZWEIMAL pro Request.
// cache() dedupliziert pro Request (Request-scoped, kein Cross-Request-
// Leak), der zweite Aufruf bekommt das bereits aufgelöste Ergebnis.
const getProduct = cache(async function getProduct(
  slug: string,
): Promise<ProductWithDetails | null> {
  const product = await db.product.findUnique({
    where: { slug, isActive: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
      variants: { where: { isActive: true }, orderBy: { priceInCents: "asc" } },
      reviews: {
        // Nur die Felder die ReviewList tatsächlich rendert. include zog
        // sonst userId, isVerified, updatedAt, productId mit — bei
        // populären Produkten halbiert das den SSR-Payload.
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          createdAt: true,
          isVerified: true,
          user: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: REVIEWS_INITIAL_TAKE,
      },
    },
  });

  return product as ProductWithDetails | null;
});

/**
 * Reviews-Aggregate für die Header-Anzeige. Gleichwertig zum vorherigen
 * `averageRating(product.reviews)` und `product.reviews.length`, aber
 * über ALLE Reviews — nicht nur die ersten 20 die wir initial laden.
 * Sonst würde der Stern-Score auf der Detailseite plötzlich anders
 * aussehen als die Listing-Page-Aggregation.
 */
async function getReviewStats(
  productId: string,
): Promise<{ totalCount: number; avgRating: number }> {
  const agg = await db.review.aggregate({
    where: { productId },
    _count: { _all: true },
    _avg: { rating: true },
  });
  return {
    totalCount: agg._count._all,
    avgRating: agg._avg.rating ?? 0,
  };
}

/**
 * Neueste veröffentlichte COA für das Produkt — wird separat geladen, damit
 * der ProductWithDetails-Typ nicht unnötig aufgebläht wird und der Query
 * schlank bleibt. Liefert null, wenn (noch) keine COA eingepflegt ist.
 */
async function getLatestCertificate(productId: string) {
  return db.certificateOfAnalysis.findFirst({
    where: { productId, isPublished: true },
    orderBy: { testDate: "desc" },
    select: {
      batchNumber: true,
      purity: true,
      testDate: true,
      testMethod: true,
      laboratory: true,
      pdfUrl: true,
      reportUrl: true,
    },
  });
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const description = product.shortDesc ?? product.description.slice(0, 160);
  const canonical = `/products/${product.slug}`;

  // og:image / twitter:image bewusst NICHT hier setzen.
  //
  // Next.js findet `src/app/(shop)/products/[slug]/opengraph-image.tsx`
  // automatisch und generiert daraus eine `og:image`-Route mit
  // dynamischem Hash (z.B. /products/<slug>/opengraph-image-16g1u1).
  // Würden wir hier `images: [...]` setzen, würde der Override greifen
  // und unser hochgeladenes Produkt-Foto als og:image verwenden — das
  // war die Ausgangslage bis AUDIT_REPORT_v3 §6 PR 9 / Audit-Sprint:
  // dadurch war die Charge-/Reinheits-Karte aus opengraph-image.tsx
  // toter Code.
  //
  // Mit dieser Variante zeigt Twitter/WhatsApp/Reddit beim Teilen die
  // generierte Karte mit „Lot CS-… · 99,71% HPLC" statt das Produkt-
  // foto. Wer das Foto bevorzugt: einfach die `openGraph.images`/
  // `twitter.images`-Felder wieder hinzufügen.

  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "de_DE",
      url: canonical,
      siteName: APP_NAME,
      title: `${product.name} | ${APP_NAME}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | ${APP_NAME}`,
      description,
    },
  };
}

// averageRating-Helper und lokales <StarRating> wurden in
// `@/components/shop/star-rating` extrahiert, weil <ReviewList>
// (Client-Component) sie ebenfalls braucht. avgRating selbst kommt
// jetzt aus getReviewStats() (DB-Aggregat über ALLE Reviews — auch
// die noch nicht gelazyloadeten).

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const isOutOfStock = product.stock <= 0;
  // hasSale-Logik wanderte in VariantBuyPanel — wird dort anhand der
  // gleichen Felder (compareAtPriceInCents, priceInCents) berechnet.

  // Related products + bestseller flags + latest COA + Review-Stats
  // run in parallel — die Stats-Aggregation muss separat laufen weil
  // wir nur die ersten 20 Reviews mitladen (Lazy-Load via Client-
  // Component für den Rest).
  const [relatedRaw, bestsellerIds, latestCoa, reviewStats] = await Promise.all([
    getRelatedProducts(
      { id: product.id, categoryId: product.categoryId },
      4
    ),
    getBestsellerProductIds(),
    getLatestCertificate(product.id),
    getReviewStats(product.id),
  ]);
  const avgRating = reviewStats.avgRating;
  const reviewsTotalCount = reviewStats.totalCount;
  const relatedProducts = relatedRaw.map((p) => ({
    ...p,
    isBestseller: bestsellerIds.has(p.id),
  }));

  const productSchema = productJsonLd({
    name: product.name,
    slug: product.slug,
    description: product.description,
    sku: product.sku,
    priceInCents: product.priceInCents,
    inStock: !isOutOfStock,
    image: product.images[0]?.url ?? null,
    ratingValue: avgRating,
    ratingCount: reviewsTotalCount,
  });

  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Products", path: "/products" },
    {
      name: product.category.name,
      path: `/products/category/${product.category.slug}`,
    },
    { name: product.name, path: `/products/${product.slug}` },
  ]);

  // Kenndaten für die Protokoll-Tabelle — eine Zeile pro vorhandenem
  // Feld, Mono-Werte, keine Icon-Deko.
  const specs: { label: string; value: string }[] = [];
  if (product.purity)
    specs.push({ label: "Reinheit", value: product.purity });
  if (product.molecularWeight)
    specs.push({ label: "Molekulargewicht", value: product.molecularWeight });
  if (product.casNumber)
    specs.push({ label: "CAS-Nummer", value: product.casNumber });
  if (product.storageTemp)
    specs.push({ label: "Lagerung", value: product.storageTemp });
  if (product.form)
    specs.push({ label: "Form", value: product.form });
  if (product.weight)
    specs.push({ label: "Gewicht", value: product.weight });
  specs.push({ label: "Artikelnummer", value: product.sku });
  // Bewusst nur binärer Status: "Verfügbar" oder "Ausverkauft". Die
  // genaue Stock-Zahl ist Admin-only-Info — Kunden interessiert nur,
  // ob sie kaufen können.
  specs.push({
    label: "Verfügbarkeit",
    value: isOutOfStock ? "Ausverkauft" : "Ab Lager verfügbar",
  });

  // Compute displayed price for the hero headline. For variant
  // products we show a range; for single-SKU products we show a
  // single price with optional compare-at strikethrough.
  const priceDisplay = (() => {
    if (product.variants.length > 0) {
      const prices = product.variants.map((v) => v.priceInCents);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max
        ? formatPrice(min)
        : `${formatPrice(min)} – ${formatPrice(max)}`;
    }
    return formatPrice(product.priceInCents);
  })();

  const coaTestedAt = latestCoa
    ? new Date(latestCoa.testDate).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col">
      {/* Analytics + structured data (invisible) */}
      <ProductViewTracker product={product} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />

      {/* ── Dossier-Kopf ──
          Breadcrumb in Mono, darunter der Dossier-Header über volle
          Breite (Kategorie-Eyebrow · H1 in Fraunces · Specimen-Tags ·
          Rating), abgeschlossen mit dem Mess-Lineal. Darunter das
          zweispaltige Arbeitsblatt: links die Abbildung, rechts die
          Kaufbox. Auf Mobile stapelt sich alles in Lesereihenfolge. */}
      <section className="hero-ambient border-b border-border">
        <div className="container relative pt-7 pb-10 md:pt-9 md:pb-14">
          {/* Breadcrumb (mono) */}
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            <Link href="/" className="transition-colors hover:text-primary-strong">
              Home
            </Link>
            <span aria-hidden className="text-muted-foreground/50">/</span>
            <Link
              href="/products"
              className="transition-colors hover:text-primary-strong"
            >
              Shop
            </Link>
            <span aria-hidden className="text-muted-foreground/50">/</span>
            <Link
              href={`/products/category/${product.category.slug}`}
              className="transition-colors hover:text-primary-strong"
            >
              {product.category.name}
            </Link>
            <span aria-hidden className="text-muted-foreground/50">/</span>
            <span aria-current="page" className="truncate text-foreground">
              {product.name}
            </span>
          </nav>

          {/* Dossier-Header */}
          <FadeUp>
            <header className="mt-8 max-w-3xl">
              <Link
                href={`/products/category/${product.category.slug}`}
                className="eyebrow gold-underline"
              >
                {product.category.name}
              </Link>
              <h1 className="display-title mt-3 text-[clamp(2.4rem,5vw,3.6rem)]">
                {product.name}
              </h1>
              {product.shortDesc && (
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
                  {product.shortDesc}
                </p>
              )}

              {/* Specimen-Tags: Lot, CAS, Reinheit, Form */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {latestCoa && (
                  <span className="trust-pill">Lot {latestCoa.batchNumber}</span>
                )}
                {product.casNumber && (
                  <span className="trust-pill">CAS {product.casNumber}</span>
                )}
                {latestCoa?.purity != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-primary/40 bg-accent px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-primary-strong">
                    {latestCoa.purity.toFixed(2)} % HPLC
                  </span>
                )}
                {product.form && (
                  <span className="trust-pill">{product.form}</span>
                )}
              </div>

              {reviewsTotalCount > 0 && (
                <div className="mt-4 flex items-center gap-2.5">
                  <StarRating rating={avgRating} />
                  <Link
                    href="#reviews"
                    className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-primary-strong"
                  >
                    {avgRating.toFixed(1)} · {reviewsTotalCount}{" "}
                    {reviewsTotalCount === 1 ? "Bewertung" : "Bewertungen"}
                  </Link>
                </div>
              )}
            </header>
          </FadeUp>

          <div className="tick-rule mt-8" aria-hidden />

          {/* Arbeitsblatt: Abbildung links, Kaufbox rechts */}
          <div className="mt-8 grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            {/* ── Abbildung ── ruhige, gerahmte Box mit feinem
                Mess-Raster. Die ImageGallery rendert frameless mit
                object-contain, damit freigestellte Vial-Bilder nicht
                beschnitten werden und das Raster bis unter die Vial
                durchscheint. Sticky auf lg+. */}
            <FadeUp>
              <div className="lg:sticky lg:top-24">
                <figure className="m-0">
                  <div className="relative overflow-hidden rounded-sm border border-border bg-card">
                    <div
                      aria-hidden
                      className="apo-grid-light pointer-events-none absolute inset-0"
                    />
                    <div className="relative z-10 p-2 md:p-3">
                      <ImageGallery
                        images={product.images.map((img) => ({
                          url: img.url,
                          alt: img.alt ?? product.name,
                        }))}
                        fit="contain"
                        frameless
                      />
                    </div>
                  </div>
                  <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Abb. 01 — {product.name}
                    {latestCoa ? ` · Lot ${latestCoa.batchNumber}` : ""}
                  </figcaption>
                </figure>
              </div>
            </FadeUp>

            {/* ── Kaufbox ── */}
            <FadeUp delay={0.08}>
              <div className="space-y-6">
                {/* Status-Zeile (binär, siehe Q2-Direktive) */}
                <p className="flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em]">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full ${
                      isOutOfStock ? "bg-destructive" : "bg-success"
                    }`}
                  />
                  <span
                    className={isOutOfStock ? "text-destructive" : "text-success"}
                  >
                    {isOutOfStock ? "Ausverkauft" : "Sofort verfügbar"}
                  </span>
                </p>

                {/* Varianten + Preis + Menge + CTA — in einem Panel
                    das den selectedVariant-State lokal hält. Früher:
                    VariantSelector und AddToCartButton waren zwei
                    unabhängige Client-Components, die per
                    `window.dispatchEvent` kommunizierten — das hat
                    Strict-Mode-Doppeltes-Register + Cross-Tab-Leak
                    erzeugt. Jetzt: ein Component, lokaler State. */}
                <VariantBuyPanel
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    priceInCents: product.priceInCents,
                    stock: product.stock,
                    image: product.images[0]?.url ?? null,
                    compareAtPriceInCents:
                      product.compareAtPriceInCents ?? null,
                  }}
                  variants={product.variants.map((v) => ({
                    id: v.id,
                    name: v.name,
                    priceInCents: v.priceInCents,
                    stock: v.stock,
                  }))}
                  priceDisplay={priceDisplay}
                />

                {/* Research-Only Fußnote zur Kaufbox */}
                <div className="border-l-2 border-primary bg-muted/50 p-4 text-[13px] leading-relaxed text-muted-foreground">
                  <strong className="font-semibold text-foreground">
                    Nur für Forschungszwecke.
                  </strong>{" "}
                  Nicht zum menschlichen Verzehr, Arzneimittel- oder
                  tierärztlichen Gebrauch. Verkauf an verifizierte
                  Forschungseinrichtungen und qualifizierte Fachkräfte.
                </div>

                {/* Trust- & CoA-Block als bewusster dunkler Ink-Einschub —
                    der Kontrastmoment in der hellen Kaufbox. CoA-Zusage
                    oben, darunter die Vertrauenssignale als Specimen-Tags
                    (card-ink themt eyebrow/trust-pill automatisch). */}
                <Card variant="ink" className="overflow-hidden p-5">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/15 text-primary">
                      <Mail className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-foreground">
                        Analysezertifikat inklusive
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                        Das passende CoA erhalten Sie automatisch per E-Mail
                        zusammen mit Ihrer Bestellung — unabhängig durch
                        Janoshik verifiziert.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-border pt-4">
                    <span className="trust-pill">
                      <ShieldCheck className="h-3 w-3 text-primary" aria-hidden />
                      Janoshik HPLC-verifiziert
                    </span>
                    <span className="trust-pill">
                      <Truck className="h-3 w-3 text-primary" aria-hidden />
                      Versand aus Deutschland
                    </span>
                    <span className="trust-pill">
                      <Mail className="h-3 w-3 text-primary" aria-hidden />
                      CoA per E-Mail
                    </span>
                  </div>
                </Card>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Protokoll: Spezifikationen + Sequenz (hell) ── */}
      {(specs.length > 0 || product.sequence) && (
        <section className="container py-12 md:py-16">
          <FadeUp>
            <div className="max-w-2xl">
              <span className="eyebrow">Protokoll</span>
              <h2 className="display-title mt-3 text-2xl md:text-3xl">
                Spezifikationen
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Alle Kenndaten dieses Produkts — dokumentiert für
                reproduzierbare Forschungsergebnisse.
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={0.05}>
            <dl className="mt-8 grid grid-cols-1 gap-x-12 border-b border-border md:grid-cols-2">
              {specs.map((spec) => (
                <SpecRow key={spec.label} k={spec.label} v={spec.value} />
              ))}
            </dl>
          </FadeUp>

          {product.sequence && (
            <FadeUp delay={0.08}>
              <div className="mt-8">
                <SequenceCopyBlock sequence={product.sequence} />
              </div>
            </FadeUp>
          )}
        </section>
      )}

      {/* ── Laborbefund (Ink) ──
          Der Kontrastmoment der Seite: die neueste COA als Dokument-
          karte auf Nachtblau, daneben die Verifikations-Story samt
          Link zur Janoshik-Gegenprüfung. Nur rendern, wenn echte
          COA-Daten vorliegen — sonst bleibt die CoA-Zusage in der
          Kaufbox der einzige Hinweis. */}
      {latestCoa && (
        <>
          <SectionBlur />
          <section className="section-ink grain-overlay relative">
            <div className="container relative z-10 section-pad">
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
                <FadeUp>
                  <div className="max-w-xl">
                    <span className="eyebrow">Laborbefund</span>
                    <h2 className="display-title mt-3 text-3xl md:text-4xl">
                      Gemessen, <em>nicht versprochen.</em>
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-ink-muted md:text-[15px]">
                      Diese Charge wurde durch das unabhängige Analyselabor
                      Janoshik per HPLC auf Reinheit und Identität geprüft.
                      Den vollständigen Befund erhalten Sie automatisch per
                      E-Mail mit Ihrer Bestellung — und jeder Report lässt
                      sich über seine Task-ID direkt beim Labor gegenprüfen.
                    </p>
                    <a
                      href="https://janoshik.com/verification"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ink mt-6"
                    >
                      Bei Janoshik verifizieren
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </div>
                </FadeUp>

                <FadeUp delay={0.08}>
                  <CertificateCard
                    lot={latestCoa.batchNumber}
                    purity={latestCoa.purity ?? undefined}
                    testedAt={coaTestedAt ?? undefined}
                    method={`${latestCoa.testMethod} · UV 220 nm`}
                    lab={latestCoa.laboratory}
                    pdfUrl={latestCoa.pdfUrl ?? latestCoa.reportUrl ?? undefined}
                  />
                </FadeUp>
              </div>
            </div>
          </section>
          <SectionBlur />
        </>
      )}

      {/* ── Beschreibung (hell, .prose) ── */}
      {product.description && (
        <section className="container py-12 md:py-16">
          <div className="max-w-3xl">
            <FadeUp>
              <span className="eyebrow">Dossier</span>
              <h2 className="display-title mt-3 text-2xl md:text-3xl">
                Beschreibung
              </h2>
            </FadeUp>
            <FadeUp delay={0.05}>
              <div className="prose mt-6 whitespace-pre-line">
                {product.description}
              </div>
            </FadeUp>
          </div>
        </section>
      )}

      {/* ── Bewertungen (hell) ── */}
      <section id="reviews" className="container scroll-mt-24 py-12 md:py-16">
        <FadeUp>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="eyebrow">Rückmeldungen</span>
              <h2 className="display-title mt-3 text-2xl md:text-3xl">
                Bewertungen
              </h2>
            </div>
            {reviewsTotalCount > 0 && (
              <div className="flex items-baseline gap-3">
                <span className="stat-value text-4xl tabular-nums md:text-5xl">
                  {avgRating.toFixed(1)}
                </span>
                <div className="pb-1">
                  <StarRating rating={avgRating} />
                  <p className="stat-key mt-1.5">
                    {reviewsTotalCount}{" "}
                    {reviewsTotalCount === 1 ? "Bewertung" : "Bewertungen"}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="tick-rule mt-6 mb-8" aria-hidden />
        </FadeUp>

        {reviewsTotalCount > 0 ? (
          <ReviewList
            productId={product.id}
            initialReviews={product.reviews.map((review) => {
              const reviewer = (review as Record<string, unknown>).user as {
                name: string | null;
                image: string | null;
              } | null;
              return {
                id: review.id,
                rating: review.rating,
                title: review.title,
                body: review.body,
                isVerified: review.isVerified,
                createdAt: review.createdAt.toISOString(),
                user: reviewer,
              } satisfies ReviewListItem;
            })}
            totalCount={reviewsTotalCount}
          />
        ) : (
          <FadeUp delay={0.05}>
            <div className="rounded-sm border border-dashed border-border py-12 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Noch keine Bewertungen erfasst
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Teilen Sie als Erste:r Ihre Erfahrung mit diesem Produkt.
              </p>
            </div>
          </FadeUp>
        )}

        <div className="mt-12 max-w-2xl">
          <ReviewSection productId={product.id} />
        </div>
      </section>

      {/* ── Ähnliche Produkte (dunkel) ── */}
      {relatedProducts.length > 0 && (
        <>
          <SectionBlur />
          <section className="section-dark">
            <div className="container py-12 md:py-16">
              <FadeUp>
                <div className="mb-10 max-w-2xl">
                  <span className="eyebrow">Auch interessant</span>
                  <h2 className="display-title mt-3 text-2xl md:text-3xl">
                    Ähnliche Produkte
                  </h2>
                  <p className="mt-2 text-sm text-ink-muted">
                    Weitere Peptide aus der Kategorie {product.category.name}
                  </p>
                </div>
              </FadeUp>

              <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 md:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:grid-cols-4">
                {relatedProducts.map((related, i) => (
                  <FadeUp key={related.id} delay={i * 0.08}>
                    <ProductCard product={related} />
                  </FadeUp>
                ))}
              </div>
            </div>
          </section>
          <SectionBlur />
        </>
      )}

      {/* ── Zuletzt angesehen (client-island, blendet sich bei leerem
          Store / SSR selbst aus; filtert das aktuelle Produkt heraus) ── */}
      <RecentlyViewed currentProductId={product.id} />

      {/* ── Research-Disclaimer als Fußnote ── */}
      <section className="border-t border-border bg-muted/30">
        <div className="container py-8">
          <p className="mono-tag text-muted-foreground">
            Hinweis — Research Use Only
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground/80">
            {RESEARCH_DISCLAIMER}
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * Zeile der Protokoll-Tabelle: Mono-Key links, Mono-Wert rechts,
 * Haarlinie oben. Die Tabelle sitzt in einem zweispaltigen Grid
 * (md+) — jede Zeile bringt ihre eigene border-t mit, die Tabelle
 * schließt mit border-b ab.
 */
function SpecRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-baseline gap-4 border-t border-border py-3.5 sm:grid-cols-[180px_1fr]">
      <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {k}
      </dt>
      <dd className="break-words font-mono text-sm tabular-nums text-foreground">
        {v}
      </dd>
    </div>
  );
}
