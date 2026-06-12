import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * getRelatedProducts — Ranking-Kaskade für den "Ähnliche Produkte"-Slot:
 *  1. meistverkaufte Kategorie-Geschwister (90 Tage, SUCCEEDED)
 *  2. Auffüllen mit neuesten Produkten derselben Kategorie
 *  3. Letzter Fallback: neueste Produkte kategorieübergreifend
 * Der Slot soll nie halb leer aussehen, Reihenfolge = Sales-Ranking.
 */
const { groupByMock, findManyMock } = vi.hoisted(() => ({
  groupByMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    orderItem: { groupBy: groupByMock },
    product: { findMany: findManyMock },
  },
}));

import { getRelatedProducts } from "@/lib/products/related";

const self = { id: "p_self", categoryId: "cat_1" };
const card = (id: string) => ({ id, name: `Produkt ${id}` });

beforeEach(() => {
  vi.clearAllMocks();
  groupByMock.mockResolvedValue([]);
  findManyMock.mockResolvedValue([]);
});

describe("getRelatedProducts", () => {
  it("Bestseller decken das Limit → genau ein Produkt-Query, Sales-Reihenfolge bleibt", async () => {
    groupByMock.mockResolvedValue([
      { productId: "p_top", _sum: { quantity: 9 } },
      { productId: "p_second", _sum: { quantity: 4 } },
    ]);
    // findMany returnt absichtlich in ANDERER Reihenfolge — die
    // groupBy-Rangfolge muss gewinnen.
    findManyMock.mockResolvedValue([card("p_second"), card("p_top")]);

    const result = await getRelatedProducts(self, 2);

    expect(result.map((p) => p.id)).toEqual(["p_top", "p_second"]);
    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(groupByMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: { not: "p_self" },
          order: expect.objectContaining({ paymentStatus: "SUCCEEDED" }),
        }),
        take: 2,
      })
    );
  });

  it("null-productIds aus groupBy werden gefiltert, inaktive Bestseller fallen weg", async () => {
    groupByMock.mockResolvedValue([
      { productId: null, _sum: { quantity: 9 } },
      { productId: "p_inactive", _sum: { quantity: 5 } },
    ]);
    findManyMock
      .mockResolvedValueOnce([]) // p_inactive ist isActive:false → leer
      .mockResolvedValueOnce([card("p_pad")]) // Kategorie-Padding
      .mockResolvedValueOnce([card("p_cross")]); // Cross-Category

    const result = await getRelatedProducts(self, 2);

    expect(result.map((p) => p.id)).toEqual(["p_pad", "p_cross"]);
  });

  it("keine Verkäufe → Padding aus derselben Kategorie reicht, kein Cross-Category-Query", async () => {
    groupByMock.mockResolvedValue([]);
    findManyMock.mockResolvedValueOnce([card("p_new1"), card("p_new2")]);

    const result = await getRelatedProducts(self, 2);

    expect(result.map((p) => p.id)).toEqual(["p_new1", "p_new2"]);
    // Erster Query ist direkt das Kategorie-Padding (bestIds leer →
    // kein firstPass-findMany), zweiter entfällt.
    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: "cat_1",
          id: { notIn: ["p_self"] },
        }),
      })
    );
  });

  it("Kategorie zu klein → Cross-Category-Fallback füllt auf, Limit wird gekappt", async () => {
    groupByMock.mockResolvedValue([{ productId: "p_top", _sum: { quantity: 2 } }]);
    findManyMock
      .mockResolvedValueOnce([card("p_top")])
      .mockResolvedValueOnce([]) // Kategorie hat keine weiteren
      .mockResolvedValueOnce([card("p_other_cat")]);

    const result = await getRelatedProducts(self, 2);

    expect(result.map((p) => p.id)).toEqual(["p_top", "p_other_cat"]);
    // Cross-Category-Query schließt self + bereits gewählte aus.
    expect(findManyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { notIn: expect.arrayContaining(["p_self", "p_top"]) },
        }),
        take: 1,
      })
    );
  });

  it("komplett leerer Katalog → leeres Array statt Crash", async () => {
    await expect(getRelatedProducts(self, 4)).resolves.toEqual([]);
  });
});
