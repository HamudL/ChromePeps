import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, PackageSearch } from "lucide-react";
import { db } from "@/lib/db";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { ProductCard } from "@/components/shop/product-card";
import { ShopFilterBar } from "@/components/shop/shop-filter-bar";
import { Button } from "@/components/ui/button";
import {
  productCardSelect,
  getBestsellerProductIds,
} from "@/lib/products/card";
import { getCategoryStats } from "@/lib/shop/stats";
import { formatPrice } from "@/lib/utils";
import type { ProductCardData } from "@/types";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";

/**
 * Kategorie-Landingpage im Apotheke-Stil — eigene Route statt nur
 * ?category=slug-Query-Param. Liefert:
 *
 *  - Back-Link zur Shop-Übersicht
 *  - 2-col Intro: links Kategorie-Titel (Fraunces) + Beschreibung;
 *    rechts Key-Stats-Box (Produkte, Ø Reinheit, Preis ab, neueste
 *    Charge)
 *  - FilterBar (die neue, Apotheke-Stil) mit basePath auf die Kategorie
 *  - Rx-Grid mit den Produkten der Kategorie
 *
 * Die alte Query-Param-URL (`/products?category=slug`) bleibt aktiv als
 * Legacy-Eintrittspunkt; der kanonische Link zeigt aber auf diese Route.
 *
 * Bewusst NICHT im Mockup umgesetzt: Sub-Filter (Regenerativ /
 * Metabolisch / GH-Sekretagog ...). Das DB-Schema kennt keine Tags/
 * Subkategorien — das muss ein separater Schema-Schritt werden.
 */

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    sort?: string;
    page?: string;
    inStock?: string;
    minPurity?: string;
  }>;
}

async function getCategoryBySlug(slug: string) {
  return db.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
  });
}

async function getAllCategories() {
  return db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Kategorie nicht gefunden" };

  const canonical = `/products/category/${slug}`;
  const description =
    category.description ??
    `Entdecken Sie unsere Auswahl an ${category.name} für wissenschaftliche Forschung.`;
  return {
    title: category.name,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "de_DE",
      title: category.name,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: category.name,
      description,
    },
  };
}

export default async function CategoryLandingPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const sort = resolvedSearch.sort ?? "newest";
  const page = Math.max(1, parseInt(resolvedSearch.page ?? "1", 10) || 1);
  const inStock = resolvedSearch.inStock === "true";
  const minPurityRaw = resolvedSearch.minPurity
    ? Number.parseFloat(resolvedSearch.minPurity)
    : NaN;
  const minPurity = Number.isFinite(minPurityRaw) ? minPurityRaw : null;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    category: { slug },
  };
  if (inStock) where.stock = { gt: 0 };
  if (minPurity != null) {
    where.certificates = {
      some: { isPublished: true, purity: { gte: minPurity } },
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
    switch (sort) {
      case "price_asc":
        return { priceInCents: "asc" as const };
      case "price_desc":
        return { priceInCents: "desc" as const };
      case "name_asc":
        return { name: "asc" as const };
      case "name_desc":
        return { name: "desc" as const };
      default:
        return { createdAt: "desc" as const };
    }
  })();

  const pageSize = ITEMS_PER_PAGE;

  const [products, total, allCategories, bestsellerIds, stats] =
    await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: productCardSelect,
      }),
      db.product.count({ where }),
      getAllCategories(),
      getBestsellerProductIds(),
      getCategoryStats(category.id),
    ]);

  const productsWithBadges: ProductCardData[] = products.map((p) => ({
    ...p,
    isBestseller: bestsellerIds.has(p.id),
  }));

  const totalPages = Math.ceil(total / pageSize);

  // Kategorie-Index "01 / 05" — mit Sort-Order aus allCategories
  const sortedIndex = allCategories.findIndex((c) => c.slug === slug);
  const categoryIndex =
    sortedIndex >= 0
      ? `${String(sortedIndex + 1).padStart(2, "0")} / ${String(
          allCategories.length
        ).padStart(2, "0")}`
      : null;

  const basePath = `/products/category/${slug}`;
  const hasActiveFilters = sort !== "newest" || inStock || minPurity != null;

  return (
    <div className="flex flex-col">
      {/* Intro (light) — kein dunkler Hero, sondern sachlich im Katalog-
          Kontext. Passt zur Apotheke-Rhythmus-Idee: der Shop-Hero bleibt
          die prominente dunkle Einführung, die Kategorie ist ein tiefer
          liegendes Kapitel. */}
      <section className="container pt-10 md:pt-14 pb-8 md:pb-10">
        <Link
          href="/products"
          className="mb-8 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Alle Kategorien
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] items-start">
          <div>
            {categoryIndex && (
              <p className="mb-3 font-mono text-[10px] tracking-[0.25em] uppercase text-primary font-semibold">
                Kategorie {categoryIndex}
              </p>
            )}
            <h1 className="font-serif text-[clamp(2.2rem,4vw,3.2rem)] font-medium tracking-[-0.025em] leading-[1.02]">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                {category.description}
              </p>
            )}
          </div>

          {/* Key-Stats-Box rechts */}
          <div className="border border-border bg-card p-5 grid grid-cols-2 gap-5">
            <StatCell label="Produkte" value={String(stats.productCount)} />
            <StatCell
              label="Ø Reinheit"
              value={
                stats.avgPurity != null
                  ? `${stats.avgPurity.toFixed(2).replace(".", ",")}%`
                  : "—"
              }
              gold
            />
            <StatCell
              label="Preis ab"
              value={
                stats.minPriceInCents != null
                  ? formatPrice(stats.minPriceInCents)
                  : "—"
              }
            />
            <StatCell
              label="Neuste Charge"
              value={stats.latestBatchNumber ?? "—"}
              small
            />
          </div>
        </div>
      </section>

      <ShopFilterBar
        categories={allCategories}
        currentCategory={slug}
        totalCount={allCategories.reduce(
          (sum, c) => sum + c._count.products,
          0
        )}
        basePath={basePath}
      />

      <section className="container py-10 md:py-14">
        {productsWithBadges.length > 0 ? (
          <>
            <div className="mb-8 flex items-baseline justify-between gap-6 border-b border-border pb-5">
              <h2 className="font-serif text-[28px] md:text-[32px] font-medium tracking-[-0.02em] leading-none">
                Alle {category.name}
              </h2>
              <div className="flex items-center gap-4">
                <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-foreground">
                  {total} {total === 1 ? "Produkt" : "Produkte"}
                </p>
                {hasActiveFilters && (
                  <Link
                    href={basePath}
                    className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted-foreground hover:text-primary underline underline-offset-4 decoration-dotted"
                  >
                    Reset
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {productsWithBadges.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={(page - 1) * pageSize + idx + 1}
                  total={total}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                basePath={basePath}
                sort={sort}
                inStock={inStock}
                minPurity={minPurity}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 md:py-32 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <PackageSearch className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Noch keine Produkte in {category.name}
            </h2>
            <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
              Schauen Sie bald wieder vorbei — wir ergänzen den Katalog
              laufend.
            </p>
            <Button asChild variant="outline">
              <Link href="/products">Alle Produkte ansehen</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCell({
  label,
  value,
  gold,
  small,
}: {
  label: string;
  value: string;
  gold?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[9.5px] tracking-[0.15em] uppercase text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold tracking-tight ${
          small ? "text-sm font-mono font-medium mt-2" : "text-[24px]"
        } ${gold ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  basePath,
  sort,
  inStock,
  minPurity,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  sort: string;
  inStock: boolean;
  minPurity: number | null;
}) {
  const buildUrl = (target: number) => {
    const params = new URLSearchParams();
    if (sort !== "newest") params.set("sort", sort);
    if (inStock) params.set("inStock", "true");
    if (minPurity != null) params.set("minPurity", String(minPurity));
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav
      className="mt-14 flex items-center justify-center gap-6 border-t border-border pt-8"
      aria-label="Pagination"
    >
      {page > 1 ? (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href={buildUrl(page - 1)}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Zurück
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="gap-2 text-muted-foreground/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück
        </Button>
      )}
      <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-foreground tabular-nums">
        Seite {page}
        <span className="mx-2 text-muted-foreground/40">/</span>
        {totalPages}
      </span>
      {page < totalPages ? (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href={buildUrl(page + 1)}>
            Weiter
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="gap-2 text-muted-foreground/40"
        >
          Weiter
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </nav>
  );
}
