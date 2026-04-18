import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/lib/db";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { ProductCard } from "@/components/shop/product-card";
import { SearchBar } from "@/components/shop/search-bar";
import { CategoryPills, SortSelect } from "@/components/shop/product-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  productCardSelect,
  getBestsellerProductIds,
} from "@/lib/products/card";
import type { ProductCardData } from "@/types";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import { PeptideNetwork } from "@/components/shop/peptide-network";

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    page?: string;
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
      canonical = `/products?category=${categorySlug}`;
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

async function getProducts(params: {
  search?: string;
  categorySlug?: string;
  sort?: string;
  page: number;
}) {
  const { search, categorySlug, sort = "newest", page } = params;
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
  if (currentParams.search) params.set("search", currentParams.search);
  if (currentParams.category) params.set("category", currentParams.category);
  if (currentParams.sort) params.set("sort", currentParams.sort);
  params.set("page", String(page));
  return `/products?${params.toString()}`;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search ?? undefined;
  const category = resolvedParams.category ?? undefined;
  const sort = resolvedParams.sort ?? "newest";
  const page = Math.max(1, parseInt(resolvedParams.page ?? "1", 10) || 1);

  const [{ products, total, totalPages }, categories] = await Promise.all([
    getProducts({ search, categorySlug: category, sort, page }),
    getCategories(),
  ]);

  const hasActiveFilters = !!(search || category || sort !== "newest");

  const currentCategoryName = category
    ? categories.find((c) => c.slug === category)?.name
    : undefined;

  const pageTitle = search
    ? `Suchergebnisse`
    : currentCategoryName ?? "Alle Produkte";

  const heroSubtitle = search
    ? `${total} ${total === 1 ? "Treffer" : "Treffer"} für „${search}"`
    : `${total} hochreine Forschungspeptide — jede Charge unabhängig durch Janoshik drittlabor-verifiziert.`;

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative hero-ambient border-b border-border/60 overflow-hidden">
        <div className="absolute inset-0 subtle-grid opacity-30" />
        <PeptideNetwork />
        {/* Vignette keeps the headline readable over the particles */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{
            background:
              "radial-gradient(720px 360px at 30% 50%, hsl(var(--background) / 0.8), transparent 70%)",
          }}
        />
        <div className="container relative py-16 md:py-20 lg:py-24">
          <div className="max-w-3xl space-y-5">
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 px-3 py-1 text-xs"
            >
              <FlaskConical className="mr-1.5 h-3 w-3 text-primary" />
              Forschungskatalog
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {heroSubtitle}
            </p>

            {/* Trust indicators inline */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Janoshik HPLC-verifiziert</span>
              </div>
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-center gap-1.5">
                <span>Versand innerhalb 24h</span>
              </div>
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-center gap-1.5">
                <span>Gratis ab 100&nbsp;€</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky Filter Bar ── */}
      <div className="sticky top-16 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="container py-3.5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Category pills — scrollable on mobile */}
            <div className="flex-1 min-w-0 -mx-4 px-4 md:mx-0 md:px-0">
              <CategoryPills
                categories={categories}
                currentCategory={category}
              />
            </div>

            {/* Search + Sort */}
            <div className="flex items-center gap-3 shrink-0">
              <SearchBar />
              <SortSelect />
            </div>
          </div>
        </div>
      </div>

      {/* ── Product Grid ── */}
      <section className="container py-10 md:py-14">
        {products.length > 0 ? (
          <>
            {/* Result count (editorial) */}
            <div className="mb-8 flex items-baseline justify-between">
              <p className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                {total} {total === 1 ? "Produkt" : "Produkte"}
                {hasActiveFilters && " · gefiltert"}
              </p>
              {hasActiveFilters && (
                <Link
                  href="/products"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-dotted"
                >
                  Filter zurücksetzen
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 md:gap-x-8 md:gap-y-16">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Editorial Pagination */}
            {totalPages > 1 && (
              <nav
                className="mt-16 flex items-center justify-center gap-6 border-t border-border/60 pt-10"
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
                      href={buildPageUrl({ search, category, sort }, page - 1)}
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

                <span className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground tabular-nums">
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
                      href={buildPageUrl({ search, category, sort }, page + 1)}
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
