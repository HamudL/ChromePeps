import "server-only";
import { db } from "@/lib/db";
import { cacheDel, cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/constants";

/**
 * Kategorie-Liste für die Shop-FilterBar — Hot Path: läuft bei JEDEM
 * Render von /products und /products/category/[slug] (beide dynamic,
 * siehe (shop)/layout.tsx). Vorher hielten beide Pages je einen
 * eigenen, UNgecachten Duplikat-Helper mit identischem Query — pro
 * Visit ein Postgres-Roundtrip inkl. _count-Subquery pro Kategorie.
 *
 * Jetzt: Redis-gecacht (5 min, wie die anderen Kategorie-Caches) und
 * zentral, damit beide Pages denselben Snapshot teilen. Invalidierung:
 * Admin-Category- und Admin-Product-Writes löschen CATEGORIES_SHOP
 * (der Active-Count hängt an beidem); ansonsten TTL.
 *
 * cacheGet/cacheSet sind graceful — bei Redis-Ausfall fällt der Helper
 * still auf den Postgres-Read zurück.
 */
export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

export async function getShopCategories(): Promise<ShopCategory[]> {
  const cached = await cacheGet<ShopCategory[]>(CACHE_KEYS.CATEGORIES_SHOP);
  if (cached) return cached;

  const result = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
  await cacheSet(CACHE_KEYS.CATEGORIES_SHOP, result, CACHE_TTL.CATEGORIES);
  return result;
}

/**
 * Invalidierung des Shop-Kategorie-Caches — zentral, weil der Active-
 * Product-Count an Category- UND Product-Writes hängt (isActive-Toggle,
 * Kategorie-Wechsel, Create/Delete). Fail-safe wie cacheDel selbst:
 * Redis-Ausfall bricht keinen Admin-Write.
 */
export async function invalidateShopCategoriesCache(): Promise<void> {
  await cacheDel(CACHE_KEYS.CATEGORIES_SHOP);
}
