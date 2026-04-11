export const revalidate = 300; // ISR: regenerate every 5 minutes

import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, FlaskConical, Thermometer, Weight, Hash, Layers, Dna } from "lucide-react";
import { db } from "@/lib/db";
import { APP_NAME, RESEARCH_DISCLAIMER } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ReviewSection } from "@/components/shop/review-section";
import { ProductCard } from "@/components/shop/product-card";
import { getRelatedProducts } from "@/lib/products/related";
import { getBestsellerProductIds } from "@/lib/products/card";
import type { Metadata } from "next";
import type { ProductWithDetails } from "@/types";

import { AddToCartButton, VariantSelector, ImageGallery } from "./product-client";
import { ProductViewTracker } from "@/components/shop/product-view-tracker";
import { RecentlyViewed } from "@/components/shop/recently-viewed";

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

  // Related products + bestseller flags run in parallel with the review
  // eligibility lookup so we don't add noticeable latency to the page.
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

  // JSON-LD structured data for Google Rich Results.
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

  // Prepare spec items
  const specs: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (product.purity)
    specs.push({ icon: <FlaskConical className="h-4 w-4" />, label: "Purity", value: product.purity });
  if (product.molecularWeight)
    specs.push({ icon: <Weight className="h-4 w-4" />, label: "Molecular Weight", value: product.molecularWeight });
  if (product.casNumber)
    specs.push({ icon: <Hash className="h-4 w-4" />, label: "CAS Number", value: product.casNumber });
  if (product.storageTemp)
    specs.push({ icon: <Thermometer className="h-4 w-4" />, label: "Storage Temp", value: product.storageTemp });
  if (product.form)
    specs.push({ icon: <Layers className="h-4 w-4" />, label: "Form", value: product.form });
  if (product.weight)
    specs.push({ icon: <Dna className="h-4 w-4" />, label: "Weight", value: product.weight });

  return (
    <div className="container py-8 md:py-12">
      {/* Track this product view in localStorage */}
      <ProductViewTracker product={product} />

      {/* Structured data for Google Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground flex items-center gap-1.5">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-foreground transition-colors">
          Products
        </Link>
        <span>/</span>
        <Link
          href={`/products?category=${product.category.slug}`}
          className="hover:text-foreground transition-colors"
        >
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
        {/* Image Gallery */}
        <ImageGallery
          images={product.images.map((img) => ({
            url: img.url,
            alt: img.alt ?? product.name,
          }))}
          productName={product.name}
        />

        {/* Product Info */}
        <div className="space-y-6">
          {/* Category & Name */}
          <div>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="text-sm text-primary hover:underline"
            >
              {product.category.name}
            </Link>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">
              {product.name}
            </h1>

            {/* Rating summary */}
            {product.reviews.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <StarRating rating={avgRating} />
                <span className="text-sm text-muted-foreground">
                  {avgRating.toFixed(1)} ({product.reviews.length}{" "}
                  {product.reviews.length === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              {formatPrice(product.priceInCents)}
            </span>
            {product.compareAtPriceInCents &&
              product.compareAtPriceInCents > product.priceInCents && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.compareAtPriceInCents)}
                </span>
              )}
            {isOutOfStock && (
              <Badge variant="secondary">Out of Stock</Badge>
            )}
          </div>

          {/* Short Description */}
          {product.shortDesc && (
            <p className="text-muted-foreground">{product.shortDesc}</p>
          )}

          {/* Variant Selector + Add to Cart */}
          <div className="space-y-4">
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

          <Separator />

          {/* Specs Table */}
          {specs.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Specifications
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {specs.map((spec) => (
                  <div key={spec.label} className="flex items-start gap-2">
                    <div className="mt-0.5 text-muted-foreground">{spec.icon}</div>
                    <div>
                      <p className="text-xs text-muted-foreground">{spec.label}</p>
                      <p className="text-sm font-medium">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sequence */}
          {product.sequence && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Amino Acid Sequence
              </h3>
              <div className="rounded-md border bg-muted/50 p-4 overflow-x-auto">
                <code className="font-mono text-sm break-all leading-relaxed">
                  {product.sequence}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Description */}
      <section className="mt-14">
        <h2 className="text-xl font-bold mb-4">Description</h2>
        <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
          {product.description}
        </div>
      </section>

      <Separator className="my-14" />

      {/* Reviews */}
      <section id="reviews" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            Reviews ({product.reviews.length})
          </h2>
          {product.reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={avgRating} />
              <span className="text-sm font-medium">
                {avgRating.toFixed(1)} out of 5
              </span>
            </div>
          )}
        </div>

        {product.reviews.length > 0 ? (
          <div className="space-y-6">
            {product.reviews.map((review) => {
              const reviewer = (review as Record<string, unknown>).user as {
                name: string | null;
                image: string | null;
              } | null;
              return (
                <Card key={review.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {reviewer?.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {reviewer?.name ?? "Anonymous"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StarRating rating={review.rating} />
                        {review.isVerified && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                    {review.title && (
                      <p className="mt-3 font-semibold text-sm">{review.title}</p>
                    )}
                    {review.body && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {review.body}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No reviews yet for this product.</p>
          </div>
        )}

        <div className="mt-8">
          <ReviewSection productId={product.id} />
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <>
          <Separator className="my-14" />
          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold">Ähnliche Produkte</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Weitere Peptide aus der Kategorie {product.category.name}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Recently Viewed */}
      <Separator className="my-14" />
      <RecentlyViewed currentProductId={product.id} />

      {/* Research Disclaimer */}
      <Separator className="my-14" />
      <section className="text-center pb-4">
        <FlaskConical className="mx-auto h-6 w-6 text-muted-foreground/50 mb-2" />
        <p className="text-xs text-muted-foreground max-w-lg mx-auto">
          {RESEARCH_DISCLAIMER}
        </p>
      </section>
    </div>
  );
}
