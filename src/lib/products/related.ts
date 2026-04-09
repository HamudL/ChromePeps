import "server-only";
import { db } from "@/lib/db";
import { productCardSelect } from "./card";
import type { ProductCardData } from "@/types";

/**
 * Returns up to `limit` products from the same category as the given
 * product, excluding the product itself. Ranking preference:
 *   1. Products with the highest paid-order count in the last 90 days
 *   2. Fallback: newest active products from the category
 *
 * If the category doesn't have enough siblings, we pad with newest
 * products from any category so the slot never looks half-empty.
 */
export async function getRelatedProducts(
  product: { id: string; categoryId: string },
  limit = 4
): Promise<ProductCardData[]> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // Find the most-ordered products in this category in the last 90 days.
  const grouped = await db.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: product.id },
      product: {
        isActive: true,
        categoryId: product.categoryId,
      },
      order: {
        createdAt: { gte: since },
        paymentStatus: "SUCCEEDED",
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const bestIds = grouped
    .map((g) => g.productId)
    .filter((id): id is string => id !== null);
  const firstPass = bestIds.length
    ? await db.product.findMany({
        where: { id: { in: bestIds }, isActive: true },
        select: productCardSelect,
      })
    : [];

  // Preserve the ranking order returned by the groupBy.
  const byId = new Map(firstPass.map((p) => [p.id, p]));
  const ordered: ProductCardData[] = bestIds
    .map((id) => byId.get(id))
    .filter((p): p is ProductCardData => !!p);

  if (ordered.length >= limit) return ordered;

  // Pad with newest same-category products.
  const excludeIds = new Set<string>([product.id, ...ordered.map((p) => p.id)]);
  const padding = await db.product.findMany({
    where: {
      isActive: true,
      categoryId: product.categoryId,
      id: { notIn: Array.from(excludeIds) },
    },
    orderBy: { createdAt: "desc" },
    take: limit - ordered.length,
    select: productCardSelect,
  });
  ordered.push(...padding);

  if (ordered.length >= limit) return ordered;

  // Last fallback: any newest active products outside the category.
  const crossCategory = await db.product.findMany({
    where: {
      isActive: true,
      id: { notIn: Array.from(new Set([...excludeIds, ...ordered.map((p) => p.id)])) },
    },
    orderBy: { createdAt: "desc" },
    take: limit - ordered.length,
    select: productCardSelect,
  });
  ordered.push(...crossCategory);

  return ordered.slice(0, limit);
}
