import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Featured-Product-Resolver für den Shop-Hero. Fallback-Kette:
 *  Bestseller #1 → neuestes Produkt mit COA → neuestes Produkt → null.
 * Pool: COA-Produkte zuerst, dann mit Nicht-COA-Produkten auffüllen.
 */
const { findFirstMock, findManyMock, bestsellerIdsMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
  bestsellerIdsMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { product: { findFirst: findFirstMock, findMany: findManyMock } },
}));
vi.mock("@/lib/products/card", () => ({
  getBestsellerProductIds: bestsellerIdsMock,
}));

import {
  getFeaturedProduct,
  getFeaturedProductPool,
} from "@/lib/products/featured";

function dbProduct(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    slug: `${id}-slug`,
    name: `Produkt ${id}`,
    shortDesc: "Kurz",
    priceInCents: 4999,
    weight: "5mg",
    form: "Lyophilisat",
    category: { name: "Peptide", slug: "peptide" },
    images: [{ url: `/img/${id}.webp`, alt: "Vial" }],
    certificates: [
      {
        batchNumber: "B-001",
        purity: 99.1,
        testMethod: "HPLC",
        laboratory: "LabX",
        testDate: new Date("2026-01-15"),
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  bestsellerIdsMock.mockResolvedValue(new Set<string>());
  findFirstMock.mockResolvedValue(null);
  findManyMock.mockResolvedValue([]);
});

describe("getFeaturedProduct", () => {
  it("Stufe 1: nimmt den Bestseller #1, wenn er aktiv ist", async () => {
    bestsellerIdsMock.mockResolvedValue(new Set(["best_1"]));
    findFirstMock.mockResolvedValueOnce(dbProduct("best_1"));

    const featured = await getFeaturedProduct();

    expect(findFirstMock).toHaveBeenCalledTimes(1);
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "best_1", isActive: true } })
    );
    expect(featured).toMatchObject({
      id: "best_1",
      categoryName: "Peptide",
      categorySlug: "peptide",
      image: { url: "/img/best_1.webp", alt: "Vial" },
      coa: expect.objectContaining({ batchNumber: "B-001" }),
    });
  });

  it("Stufe 2: ohne Bestseller → neuestes aktives Produkt MIT veröffentlichter COA", async () => {
    findFirstMock.mockResolvedValueOnce(dbProduct("coa_prod"));

    const featured = await getFeaturedProduct();

    // Kein Bestseller → die Bestseller-findFirst wird übersprungen.
    expect(findFirstMock).toHaveBeenCalledTimes(1);
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          certificates: { some: { isPublished: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    );
    expect(featured?.id).toBe("coa_prod");
  });

  it("Stufe 3: Bestseller inaktiv + keine COA-Produkte → neuestes aktives Produkt; leere Relationen → null-Felder", async () => {
    bestsellerIdsMock.mockResolvedValue(new Set(["best_gone"]));
    findFirstMock
      .mockResolvedValueOnce(null) // Bestseller-Lookup: inaktiv/gelöscht
      .mockResolvedValueOnce(null) // COA-Fallback: nichts
      .mockResolvedValueOnce(dbProduct("plain", { images: [], certificates: [] }));

    const featured = await getFeaturedProduct();

    expect(findFirstMock).toHaveBeenCalledTimes(3);
    expect(featured).toMatchObject({ id: "plain", image: null, coa: null });
  });

  it("Stufe 4: komplett leerer Katalog → null (Hero ohne Featured-Block)", async () => {
    await expect(getFeaturedProduct()).resolves.toBeNull();
    expect(findFirstMock).toHaveBeenCalledTimes(2);
  });
});

describe("getFeaturedProductPool", () => {
  it("genug COA-Produkte → kein Auffüll-Query", async () => {
    findManyMock.mockResolvedValueOnce([dbProduct("a"), dbProduct("b")]);

    const pool = await getFeaturedProductPool(2);

    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(pool.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("zu wenige COA-Produkte → füllt mit Nicht-COA-Produkten auf (notIn-Dedupe)", async () => {
    findManyMock
      .mockResolvedValueOnce([dbProduct("coa_1")])
      .mockResolvedValueOnce([
        dbProduct("plain_1", { images: [], certificates: [] }),
      ]);

    const pool = await getFeaturedProductPool(2);

    expect(findManyMock).toHaveBeenCalledTimes(2);
    expect(findManyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { isActive: true, id: { notIn: ["coa_1"] } },
        take: 1,
      })
    );
    expect(pool.map((p) => p.id)).toEqual(["coa_1", "plain_1"]);
    expect(pool[1]).toMatchObject({ image: null, coa: null });
  });

  it("leerer Katalog → leerer Pool", async () => {
    await expect(getFeaturedProductPool(3)).resolves.toEqual([]);
  });
});
