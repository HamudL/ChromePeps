import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BESTSELLER_LIMIT, BESTSELLER_WINDOW_DAYS } from "./badges";

/**
 * Shared Prisma `select` shape for anywhere we render a ProductCard.
 * Keeps the wire format identical between home/catalog/related-products so
 * the type system catches drift instead of runtime surprises.
 */
export const productCardSelect = {
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
  createdAt: true,
  images: {
    select: { url: true, alt: true },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
  },
  category: {
    select: { name: true, slug: true },
  },
} satisfies Prisma.ProductSelect;

/**
 * Returns the set of product IDs that currently count as bestsellers:
 * the top-N products (default 10) by sum of ordered quantity in the
 * lookback window (default 90 days).
 *
 * Only counts items from orders that were actually paid — PENDING or
 * CANCELLED orders don't move the needle.
 */
export async function getBestsellerProductIds(
  options: { limit?: number; windowDays?: number } = {}
): Promise<Set<string>> {
  const limit = options.limit ?? BESTSELLER_LIMIT;
  const windowDays = options.windowDays ?? BESTSELLER_WINDOW_DAYS;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  try {
    const rows = await db.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          createdAt: { gte: since },
          paymentStatus: "SUCCEEDED",
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });
    return new Set(
      rows
        .map((r) => r.productId)
        .filter((id): id is string => id !== null)
    );
  } catch (err) {
    // A failed bestseller lookup must never break the catalog — fall back
    // to an empty set so the page still renders without bestseller badges.
    console.error("[bestsellers] lookup failed", err);
    return new Set<string>();
  }
}
