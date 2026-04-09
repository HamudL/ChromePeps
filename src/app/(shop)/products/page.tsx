export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { db } from "@/lib/db";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { ProductCard } from "@/components/shop/product-card";
import { SearchBar } from "@/components/shop/search-bar";
import { ProductFilters } from "@/components/shop/product-filters";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ProductCardData } from "@/types";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";

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

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDesc: true,
        priceInCents: true,
        compareAtPriceInCents: true,
        purity: true,
        weight: true,
        isActive: true,
        stock: true,
        images: {
          select: { url: true, alt: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
        category: {
          select: { name: true, slug: true },
        },
      },
    }),
    db.product.count({ where }),
  ]);

  return {
    products: products as ProductCardData[],
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

  return (
    <div className="container py-8 md:py-12">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {category
            ? categories.find((c) => c.slug === category)?.name ?? "Products"
            : "All Products"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {total} {total === 1 ? "product" : "products"} found
          {search && (
            <>
              {" "}
              for &ldquo;<span className="font-medium text-foreground">{search}</span>&rdquo;
            </>
          )}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 mb-8">
        <SearchBar />
        <ProductFilters categories={categories} />
      </div>

      <Separator className="mb-8" />

      {/* Product Grid */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="mt-12 flex items-center justify-center gap-2"
              aria-label="Pagination"
            >
              {page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={buildPageUrl(
                      { search, category, sort },
                      page - 1
                    )}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
              )}

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show first, last, and pages near current
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - page) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                    if (idx > 0) {
                      const prev = arr[idx - 1];
                      if (p - prev > 1) {
                        acc.push("ellipsis");
                      }
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) => {
                    if (item === "ellipsis") {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-2 text-muted-foreground"
                        >
                          ...
                        </span>
                      );
                    }
                    return item === page ? (
                      <Button
                        key={item}
                        variant="default"
                        size="sm"
                        className="min-w-[2.25rem]"
                        disabled
                      >
                        {item}
                      </Button>
                    ) : (
                      <Button
                        key={item}
                        asChild
                        variant="outline"
                        size="sm"
                        className="min-w-[2.25rem]"
                      >
                        <Link
                          href={buildPageUrl(
                            { search, category, sort },
                            item
                          )}
                        >
                          {item}
                        </Link>
                      </Button>
                    );
                  })}
              </div>

              {page < totalPages ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={buildPageUrl(
                      { search, category, sort },
                      page + 1
                    )}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageSearch className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No products found</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {hasActiveFilters
              ? "Try adjusting your search or filters to find what you are looking for."
              : "Check back soon for new additions to our catalog."}
          </p>
          {hasActiveFilters && (
            <Button asChild variant="outline">
              <Link href="/products">Clear All Filters</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
