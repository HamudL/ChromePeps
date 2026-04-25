import Link from "next/link";
import { ArrowLeft, ArrowRight, PackageSearch } from "lucide-react";
import { db } from "@/lib/db";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { ProductCard } from "@/components/shop/product-card";
import { ApothekeShopHero } from "@/components/shop/apotheke-shop-hero";
import { ShopFilterBar } from "@/components/shop/shop-filter-bar";
import { Button } from "@/components/ui/button";
import {
  productCardSelect,
  getBestsellerProductIds,
} from "@/lib/products/card";
import { getFeaturedProduct } from "@/lib/products/featured";
import { getShopStats } from "@/lib/shop/stats";
import type { ProductCardData } from "@/types";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    page?: string;
    inStock?: string;
    minPurity?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const categorySlug = resolvedParams.category;
  const search = resolvedParams.search;

  let title = "Produkte";
  let description =
    "Durchstöbern Sie unseren Katalog hochwertiger Forschungspeptide — laborgeprüfte Reinheit und umfassende Analysezertifikate.";
  let canonical = "/products";

  if (categorySlug) {
    const category = await db.category.findUnique({
      where: { slug: categorySlug },
      select: { name: true, description: true },
    });
    if (category) {
      title = category.name;
      description =
        category.description ??
        `Entdecken Sie unsere Auswahl an ${category.name} für wissenschaftliche Forschung.`;
      // Kanonisch ist die neue Category-Landing-Route; die
       // Query-Variante bleibt als funktionaler Alias erhalten.
       canonical = `/products/category/${categorySlug}`;
    }
  } else if (search) {
    title = `Suche: ${search}`;
    description = `Suchergebnisse für "${search}" im ChromePeps-Katalog.`;
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "de_DE",
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

async function getCategories() {
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

interface GetProductsParams {
  search?: string;
  categorySlug?: string;
  sort?: string;
  page: number;
  inStock: boolean;
  minPurity: number | null;
}

async function getProducts(params: GetProductsParams) {
  const {
    search,
    categorySlug,
    sort = "newest",
    page,
    inStock,
    minPurity,
  } = params;
  const pageSize = ITEMS_PER_PAGE;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { shortDesc: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { casNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (inStock) {
    where.stock = { gt: 0 };
  }

  if (minPurity != null) {
    // "Ab X% Reinheit" — matcht Produkte mit mindestens einer
    // veröffentlichten COA >= minPurity. Semantik: "es gibt (mindestens)
    // eine Charge, die den Schwellenwert erreicht". Das reicht für den
    // Kunden-Filter; wer die aktuelle Charge prüfen will, öffnet die
    // Produktdetailseite.
    where.certificates = {
      some: {
        isPublished: true,
        purity: { gte: minPurity },
      },
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

  const [products, total, bestsellerIds] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: productCardSelect,
    }),
    db.product.count({ where }),
    getBestsellerProductIds(),
  ]);

  const productsWithBadges: ProductCardData[] = products.map((p) => ({
    ...p,
    isBestseller: bestsellerIds.has(p.id),
  }));

  return {
    products: productsWithBadges,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

function buildPageUrl(
  currentParams: Record<string, string | undefined>,
  page: number
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(currentParams)) {
    if (v != null && v !== "") params.set(k, v);
  }
  params.set("page", String(page));
  return `/products?${params.toString()}`;
}

function formatStatsDate(): string {
  return new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search ?? undefined;
  const category = resolvedParams.category ?? undefined;
  const sort = resolvedParams.sort ?? "newest";
  const page = Math.max(1, parseInt(resolvedParams.page ?? "1", 10) || 1);
  const inStock = resolvedParams.inStock === "true";
  const minPurityRaw = resolvedParams.minPurity
    ? Number.parseFloat(resolvedParams.minPurity)
    : NaN;
  const minPurity = Number.isFinite(minPurityRaw) ? minPurityRaw : null;

  const [{ products, total, totalPages }, categories, stats, featured] =
    await Promise.all([
      getProducts({
        search,
        categorySlug: category,
        sort,
        page,
        inStock,
        minPurity,
      }),
      getCategories(),
      getShopStats(),
      // Featured nur auf der Haupt-Listing-Seite (ohne Kategorie-Filter
      // und ohne Suche) — sonst wäre "ein Bestseller" als Eyecatcher
      // neben einer Suche/Filterung semantisch falsch.
      !category && !search ? getFeaturedProduct() : Promise.resolve(null),
    ]);

  const hasActiveFilters = !!(
    search ||
    category ||
    sort !== "newest" ||
    inStock ||
    minPurity != null
  );

  const currentCategoryName = category
    ? categories.find((c) => c.slug === category)?.name
    : undefined;

  const pageTitle = search
    ? "Suchergebnisse"
    : currentCategoryName ?? "Alle Produkte";

  const heroStats: { value: string; label: string; suffix?: string }[] = [];
  if (stats.batchCount > 0) {
    heroStats.push({
      value: stats.batchCount.toLocaleString("de-DE"),
      label: "Chargen getestet",
    });
  }
  if (stats.avgPurity12m != null) {
    heroStats.push({
      value: stats.avgPurity12m.toFixed(2).replace(".", ","),
      suffix: "%",
      label: "\u00D8 Reinheit",
    });
  }

  const year = new Date().getFullYear();
  const heroTitle = search ? (
    <>
      Suche. <em className="font-serif italic font-normal text-primary">Gefiltert.</em>{" "}
      Versand aus Deutschland.
    </>
  ) : (
    <>
      Rein. <em className="font-serif italic font-normal text-primary">Verifiziert.</em>{" "}
      Versand aus Deutschland.
    </>
  );

  const heroSubline = search
    ? `${total} Treffer für „${search}".`
    : "Jede Charge HPLC‑geprüft bei Janoshik Labs. CoA‑PDF und Lot‑Nummer zu jeder Bestellung per E‑Mail.";

  return (
    <div className="flex flex-col">
      <ApothekeShopHero
        crumb={["ChromePeps", "Research Peptides", `Katalog ${year}`]}
        title={heroTitle}
        subline={heroSubline}
        stats={heroStats}
        featured={featured}
      />

      <ShopFilterBar
        categories={categories}
        currentCategory={category}
        totalCount={categories.reduce((sum, c) => sum + c._count.products, 0)}
        basePath="/products"
      />

      <section className="container py-10 md:py-14">
        {products.length > 0 ? (
          <>
            {/* Meta-Row: Titel + Gesamt-Count */}
            <div className="mb-8 flex items-baseline justify-between gap-6 border-b border-border pb-5">
              <h2 className="font-serif text-[28px] md:text-[32px] font-medium tracking-[-0.02em] leading-none">
                {pageTitle}
              </h2>
              <div className="flex items-center gap-4">
                <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-foreground">
                  {total} {total === 1 ? "Produkt" : "Produkte"}
                  {" \u00B7 Stand "}
                  {formatStatsDate()}
                </p>
                {hasActiveFilters && (
                  <Link
                    href="/products"
                    className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted-foreground hover:text-primary underline underline-offset-4 decoration-dotted"
                  >
                    Reset
                  </Link>
                )}
              </div>
            </div>

            {/* Rx-Grid */}
            {/* Grid: auf Mobile (< 640 px) 1 Karte pro Zeile, damit die
                Rx-Spec-Rows und der Name nicht mehr abgeschnitten werden.
                Ab sm: (640 px) darf die 2-Spalten-Ansicht zur\u00fcckkommen,
                weil dort die Karten-Breite wieder reicht. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={(page - 1) * ITEMS_PER_PAGE + idx + 1}
                  total={total}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
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
                    <Link
                      href={buildPageUrl(
                        {
                          search,
                          category,
                          sort: sort === "newest" ? undefined : sort,
                          inStock: inStock ? "true" : undefined,
                          minPurity: minPurity != null ? String(minPurity) : undefined,
                        },
                        page - 1
                      )}
                    >
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
                    <Link
                      href={buildPageUrl(
                        {
                          search,
                          category,
                          sort: sort === "newest" ? undefined : sort,
                          inStock: inStock ? "true" : undefined,
                          minPurity: minPurity != null ? String(minPurity) : undefined,
                        },
                        page + 1
                      )}
                    >
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
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 md:py-32 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <PackageSearch className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Keine Produkte gefunden</h2>
            <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
              {hasActiveFilters
                ? "Versuchen Sie, Ihre Suche oder Filter anzupassen."
                : "Schauen Sie bald wieder vorbei — neue Produkte sind in Vorbereitung."}
            </p>
            {hasActiveFilters && (
              <Button asChild variant="outline">
                <Link href="/products">Alle Filter zurücksetzen</Link>
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
