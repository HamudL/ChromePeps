import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/constants";
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
  variants: {
    where: { isActive: true },
    select: { priceInCents: true },
    orderBy: { priceInCents: "asc" as const },
  },
  // Neueste veröffentlichte COA pro Produkt — füttert den Spec-Drawer der
  // ProductCard (Reinheit als Float, Lot = Chargennummer). Prisma macht
  // hier ein Sub-Select pro Produkt (N+1), aber bei 12–20 Karten pro Seite
  // und einem Index auf (productId) ist das unkritisch. Keeping `purity`
  // (String) oben drauf für Abwärtskompatibilität mit bestehender Spec-
  // Liste auf der Detailseite.
  certificates: {
    where: { isPublished: true },
    orderBy: { testDate: "desc" as const },
    take: 1,
    select: {
      batchNumber: true,
      purity: true,
    },
  },
} satisfies Prisma.ProductSelect;

/**
 * Returns the set of product IDs that currently count as bestsellers:
 * the top-N products (default 10) by sum of ordered quantity in the
 * lookback window (default 90 days).
 *
 * Only counts items from orders that were actually paid — PENDING or
 * CANCELLED orders don't move the needle.
 *
 * Caching: Default-Aufrufe (ohne explizite options) gehen über Redis
 * mit 5-min-TTL. Bei Page-Renders auf Home/Catalog/Category/Detail
 * dadurch nur 1 Postgres-Roundtrip alle 5 Minuten statt 1 pro Visit.
 * Aufrufe mit custom limit/windowDays gehen direkt an die DB
 * (Cache-Key ist auf den Default-Cut gemünzt — andere Werte würden
 * fälschlicherweise denselben Key benutzen).
 */
export async function getBestsellerProductIds(
  options: { limit?: number; windowDays?: number } = {}
): Promise<Set<string>> {
  const limit = options.limit ?? BESTSELLER_LIMIT;
  const windowDays = options.windowDays ?? BESTSELLER_WINDOW_DAYS;
  const usingDefaults =
    options.limit === undefined && options.windowDays === undefined;

  // Cache-Hit-Pfad — nur bei Default-Cut, sonst kein deterministischer Key.
  if (usingDefaults) {
    const cached = await cacheGet<string[]>(CACHE_KEYS.BESTSELLER_IDS);
    if (cached) {
      return new Set(cached);
    }
  }

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
    const ids = rows
      .map((r) => r.productId)
      .filter((id): id is string => id !== null);

    if (usingDefaults) {
      // fire-and-forget set — wenn Redis weg ist, fallen wir auf Postgres
      // zurück, kein User merkt das.
      await cacheSet(CACHE_KEYS.BESTSELLER_IDS, ids, CACHE_TTL.BESTSELLER_IDS);
    }
    return new Set(ids);
  } catch (err) {
    // A failed bestseller lookup must never break the catalog — fall back
    // to an empty set so the page still renders without bestseller badges.
    console.error("[bestsellers] lookup failed", err);
    return new Set<string>();
  }
}
