import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Shop-Kategorie-Liste (Hot Path /products): Redis-Cache vor Postgres.
 * Getestet wird die Cache-Hit/Miss-Logik und die Invalidierung.
 */
const { dbMock, cacheGetMock, cacheSetMock, cacheDelMock } = vi.hoisted(
  () => ({
    dbMock: { category: { findMany: vi.fn() } },
    cacheGetMock: vi.fn(),
    cacheSetMock: vi.fn(),
    cacheDelMock: vi.fn(),
  })
);

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/redis", () => ({
  cacheGet: cacheGetMock,
  cacheSet: cacheSetMock,
  cacheDel: cacheDelMock,
}));

import {
  getShopCategories,
  invalidateShopCategoriesCache,
} from "@/lib/shop/categories";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/constants";

const categories = [
  { id: "c1", name: "Peptide", slug: "peptide", _count: { products: 12 } },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getShopCategories", () => {
  it("Cache-Hit: returnt den Snapshot ohne DB-Roundtrip", async () => {
    cacheGetMock.mockResolvedValue(categories);
    await expect(getShopCategories()).resolves.toEqual(categories);
    expect(dbMock.category.findMany).not.toHaveBeenCalled();
    expect(cacheSetMock).not.toHaveBeenCalled();
  });

  it("Cache-Miss: liest Postgres (nur AKTIVE Produkte gezählt) und cached", async () => {
    cacheGetMock.mockResolvedValue(null);
    dbMock.category.findMany.mockResolvedValue(categories);

    await expect(getShopCategories()).resolves.toEqual(categories);
    expect(dbMock.category.findMany).toHaveBeenCalledWith({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });
    expect(cacheSetMock).toHaveBeenCalledWith(
      CACHE_KEYS.CATEGORIES_SHOP,
      categories,
      CACHE_TTL.CATEGORIES
    );
  });
});

describe("invalidateShopCategoriesCache", () => {
  it("löscht den Shop-Kategorie-Key", async () => {
    await invalidateShopCategoriesCache();
    expect(cacheDelMock).toHaveBeenCalledWith(CACHE_KEYS.CATEGORIES_SHOP);
  });
});
