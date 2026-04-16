export const revalidate = 300; // ISR: regenerate every 5 minutes

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Star,
  FlaskConical,
  Thermometer,
  Weight,
  Hash,
  Layers,
  Dna,
  ShieldCheck,
  Truck,
  Mail,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { APP_NAME, RESEARCH_DISCLAIMER } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewSection } from "@/components/shop/review-section";
import { ProductCard } from "@/components/shop/product-card";
import { getRelatedProducts } from "@/lib/products/related";
import { getBestsellerProductIds } from "@/lib/products/card";
import type { Metadata } from "next";
import type { ProductWithDetails } from "@/types";

import {
  AddToCartButton,
  VariantSelector,
  ImageGallery,
  SequenceCopyBlock,
} from "./product-client";
import { ProductViewTracker } from "@/components/shop/product-view-tracker";
import { FadeUp } from "../../home-animations";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string): Promise<ProductWithDetails | null> {
  const product = await db.product.findUnique({
    where: { slug, isActive: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
      variants: { where: { isActive: true }, orderBy: { priceInCents: "asc" } },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, image: true } },
        },
      },
    },
  });

  return product as ProductWithDetails | null;
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
  const ogImage = product.images[0]
    ? [
        {
          url: product.images[0].url,
          alt: product.images[0].alt ?? product.name,
          width: 1200,
          height: 630,
        },
      ]
    : undefined;

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
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | ${APP_NAME}`,
      description,
      images: ogImage?.map((img) => img.url),
    },
  };
}

function averageRating(reviews: ProductWithDetails["reviews"]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return sum / reviews.length;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const avgRating = averageRating(product.reviews);
  const isOutOfStock = product.stock <= 0;
  const hasSale =
    product.compareAtPriceInCents &&
    product.compareAtPriceInCents > product.priceInCents;

  // Related products + bestseller flags run in parallel.
  const [relatedRaw, bestsellerIds] = await Promise.all([
    getRelatedProducts(
      { id: product.id, categoryId: product.categoryId },
      4
    ),
    getBestsellerProductIds(),
  ]);
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
    ratingCount: product.reviews.length,
  });

  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Products", path: "/products" },
    {
      name: product.category.name,
      path: `/products?category=${product.category.slug}`,
    },
    { name: product.name, path: `/products/${product.slug}` },
  ]);

  // Collect specs — the same shape as before but now rendered as
  // editorial mini-cards instead of a flat icon-label-value list.
  const specs: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (product.purity)
    specs.push({ icon: <FlaskConical className="h-4 w-4" />, label: "Reinheit", value: product.purity });
  if (product.molecularWeight)
    specs.push({ icon: <Weight className="h-4 w-4" />, label: "Molekulargewicht", value: product.molecularWeight });
  if (product.casNumber)
    specs.push({ icon: <Hash className="h-4 w-4" />, label: "CAS-Nummer", value: product.casNumber });
  if (product.storageTemp)
    specs.push({ icon: <Thermometer className="h-4 w-4" />, label: "Lagerung", value: product.storageTemp });
  if (product.form)
    specs.push({ icon: <Layers className="h-4 w-4" />, label: "Form", value: product.form });
  if (product.weight)
    specs.push({ icon: <Dna className="h-4 w-4" />, label: "Gewicht", value: product.weight });

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

  return (
    <div className="flex flex-col">
      {/* Analytics + structured data (invisible) */}
      <ProductViewTracker product={product} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* ── Hero: product card with ambient background ── */}
      <section className="relative hero-ambient border-b border-border/60">
        <div className="absolute inset-0 subtle-grid opacity-30" />
        <div className="container relative py-8 md:py-12 lg:py-14">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex items-center gap-1 text-xs text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            <Link
              href="/products"
              className="hover:text-foreground transition-colors"
            >
              Shop
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {product.category.name}
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-foreground font-medium truncate">
              {product.name}
            </span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* ── Image Gallery (left) ── */}
            <FadeUp>
              <div className="lg:sticky lg:top-24">
                <ImageGallery
                  images={product.images.map((img) => ({
                    url: img.url,
                    alt: img.alt ?? product.name,
                  }))}
                  productName={product.name}
                />
              </div>
            </FadeUp>

            {/* ── Product Info + Buy Panel (right) ── */}
            <FadeUp delay={0.1}>
              <div className="space-y-6">
                {/* Category + Name + Rating */}
                <div className="space-y-3">
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/5 px-3 py-1 text-xs"
                  >
                    <FlaskConical className="mr-1.5 h-3 w-3 text-primary" />
                    <Link
                      href={`/products?category=${product.category.slug}`}
                      className="hover:underline"
                    >
                      {product.category.name}
                    </Link>
                  </Badge>

                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                    {product.name}
                  </h1>

                  {product.reviews.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <StarRating rating={avgRating} />
                      <span className="text-sm text-muted-foreground">
                        {avgRating.toFixed(1)} · {product.reviews.length}{" "}
                        {product.reviews.length === 1
                          ? "Bewertung"
                          : "Bewertungen"}
                      </span>
                    </div>
                  )}

                  {product.shortDesc && (
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {product.shortDesc}
                    </p>
                  )}
                </div>

                {/* Elevated buy panel */}
                <div className="rounded-2xl border bg-gradient-to-br from-card to-muted/30 p-5 md:p-6 shadow-sm">
                  {/* Price row */}
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight">
                      {priceDisplay}
                    </span>
                    {product.variants.length === 0 && hasSale && (
                      <span className="text-lg text-muted-foreground line-through tabular-nums">
                        {formatPrice(product.compareAtPriceInCents!)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      inkl. 19% MwSt.
                    </span>
                    {isOutOfStock && (
                      <Badge variant="secondary" className="ml-auto">
                        Ausverkauft
                      </Badge>
                    )}
                  </div>

                  {/* Variant selector + CTA */}
                  <div className="mt-5 space-y-4">
                    {product.variants.length > 0 && (
                      <VariantSelector
                        variants={product.variants.map((v) => ({
                          id: v.id,
                          name: v.name,
                          priceInCents: v.priceInCents,
                          stock: v.stock,
                        }))}
                      />
                    )}

                    <AddToCartButton
                      product={{
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        priceInCents: product.priceInCents,
                        stock: product.stock,
                        image: product.images[0]?.url ?? null,
                      }}
                      variants={product.variants.map((v) => ({
                        id: v.id,
                        name: v.name,
                        priceInCents: v.priceInCents,
                        stock: v.stock,
                      }))}
                    />
                  </div>
                </div>

                {/* Trust-indicator row (matches products page hero) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span>Janoshik HPLC-verifiziert</span>
                  </div>
                  <span className="text-muted-foreground/40">·</span>
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                    <span>Versand innerhalb 24h</span>
                  </div>
                  <span className="text-muted-foreground/40">·</span>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>CoA per E-Mail</span>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Specs + Sequence (light) ── */}
      {(specs.length > 0 || product.sequence) && (
        <section className="container py-12 md:py-16">
          {specs.length > 0 && (
            <>
              <FadeUp>
                <div className="mb-8 max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.15em] font-semibold text-primary mb-2">
                    Technische Daten
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Spezifikationen
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Präzise dokumentiert für reproduzierbare Forschungsergebnisse.
                  </p>
                </div>
              </FadeUp>

              <FadeUp delay={0.05}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="group rounded-xl border bg-card p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                          {spec.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                            {spec.label}
                          </p>
                          <p className="text-sm md:text-base font-semibold break-words mt-0.5">
                            {spec.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </FadeUp>
            </>
          )}

          {product.sequence && (
            <FadeUp delay={0.1}>
              <div className="mt-8">
                <SequenceCopyBlock sequence={product.sequence} />
              </div>
            </FadeUp>
          )}
        </section>
      )}

      {/* ── Beschreibung (dark) ── */}
      {product.description && (
        <section className="section-dark border-y border-white/5">
          <div className="container py-12 md:py-16">
            <div className="max-w-3xl">
              <FadeUp>
                <p className="text-xs uppercase tracking-[0.15em] font-semibold text-primary mb-2">
                  Über dieses Peptid
                </p>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
                  Beschreibung
                </h2>
              </FadeUp>
              <FadeUp delay={0.05}>
                <div className="prose prose-sm prose-invert max-w-none text-white/70 whitespace-pre-line leading-relaxed">
                  {product.description}
                </div>
              </FadeUp>
            </div>
          </div>
        </section>
      )}

      {/* ── Reviews (light) ── */}
      <section id="reviews" className="container py-12 md:py-16 scroll-mt-24">
        <FadeUp>
          <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] font-semibold text-primary mb-2">
                Community
              </p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Bewertungen
                <span className="ml-2 text-muted-foreground font-medium">
                  ({product.reviews.length})
                </span>
              </h2>
            </div>
            {product.reviews.length > 0 && (
              <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 shadow-sm">
                <StarRating rating={avgRating} />
                <span className="text-sm font-semibold tabular-nums">
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">/ 5</span>
              </div>
            )}
          </div>
        </FadeUp>

        {product.reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.reviews.map((review, i) => {
              const reviewer = (review as Record<string, unknown>).user as {
                name: string | null;
                image: string | null;
              } | null;
              return (
                <FadeUp key={review.id} delay={i * 0.05}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-semibold text-primary">
                            {reviewer?.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {reviewer?.name ?? "Anonym"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString(
                                "de-DE",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <StarRating rating={review.rating} />
                          {review.isVerified && (
                            <Badge
                              variant="outline"
                              className="border-primary/40 bg-primary/5 text-[10px] px-1.5 py-0"
                            >
                              <ShieldCheck className="mr-1 h-2.5 w-2.5 text-primary" />
                              Verifiziert
                            </Badge>
                          )}
                        </div>
                      </div>
                      {review.title && (
                        <p className="mt-3 font-semibold text-sm">
                          {review.title}
                        </p>
                      )}
                      {review.body && (
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                          {review.body}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </FadeUp>
              );
            })}
          </div>
        ) : (
          <FadeUp delay={0.05}>
            <div className="rounded-2xl border-2 border-dashed border-border/60 py-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Noch keine Bewertungen. Sei der Erste!
              </p>
            </div>
          </FadeUp>
        )}

        <div className="mt-10">
          <ReviewSection productId={product.id} />
        </div>
      </section>

      {/* ── Related Products (dark) ── */}
      {relatedProducts.length > 0 && (
        <section className="section-dark border-t border-white/5">
          <div className="container py-12 md:py-16">
            <FadeUp>
              <div className="mb-10 max-w-2xl">
                <p className="text-xs uppercase tracking-[0.15em] font-semibold text-primary mb-2">
                  Auch interessant
                </p>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Ähnliche Produkte
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  Weitere Peptide aus der Kategorie {product.category.name}
                </p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 md:gap-x-6 md:gap-y-12">
              {relatedProducts.map((related, i) => (
                <FadeUp key={related.id} delay={i * 0.08}>
                  <ProductCard product={related} />
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Research Disclaimer ── */}
      <section className="border-t">
        <div className="container py-6 text-center">
          <p className="text-xs text-muted-foreground/60 max-w-2xl mx-auto leading-relaxed">
            {RESEARCH_DISCLAIMER}
          </p>
        </div>
      </section>
    </div>
  );
}
