import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Aggregierte Vertrauens-Kennzahlen (Hero/LiveMetrics) — Prisma wird
 * gemockt, getestet wird das Mapping inkl. der null-Fallbacks für
 * Kategorien ohne COAs/Produkte.
 */
const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    certificateOfAnalysis: {
      count: vi.fn(),
      aggregate: vi.fn(),
      findFirst: vi.fn(),
    },
    product: { aggregate: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import { getShopStats, getCategoryStats } from "@/lib/shop/stats";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getShopStats", () => {
  it("liefert Chargen-Count und Ø-Reinheit der letzten 12 Monate", async () => {
    dbMock.certificateOfAnalysis.count.mockResolvedValue(57);
    dbMock.certificateOfAnalysis.aggregate.mockResolvedValue({
      _avg: { purity: 99.42 },
    });

    await expect(getShopStats()).resolves.toEqual({
      batchCount: 57,
      avgPurity12m: 99.42,
    });
    // Nur veröffentlichte COAs zählen.
    expect(dbMock.certificateOfAnalysis.count).toHaveBeenCalledWith({
      where: { isPublished: true },
    });
    // 12-Monats-Fenster im Aggregate-Filter.
    const aggArgs = dbMock.certificateOfAnalysis.aggregate.mock.calls[0][0];
    expect(aggArgs.where.testDate.gte).toBeInstanceOf(Date);
  });

  it("mappt fehlende Reinheits-Daten auf null", async () => {
    dbMock.certificateOfAnalysis.count.mockResolvedValue(0);
    dbMock.certificateOfAnalysis.aggregate.mockResolvedValue({
      _avg: { purity: null },
    });

    await expect(getShopStats()).resolves.toEqual({
      batchCount: 0,
      avgPurity12m: null,
    });
  });
});

describe("getCategoryStats", () => {
  it("aggregiert Produkt-Count, Ø-Reinheit, Min-Preis und neueste Charge", async () => {
    dbMock.product.aggregate.mockResolvedValue({
      _count: { _all: 8 },
      _min: { priceInCents: 2999 },
    });
    dbMock.certificateOfAnalysis.aggregate.mockResolvedValue({
      _avg: { purity: 99.1 },
    });
    dbMock.certificateOfAnalysis.findFirst.mockResolvedValue({
      batchNumber: "LOT-2026-17",
    });

    await expect(getCategoryStats("cat_1")).resolves.toEqual({
      productCount: 8,
      avgPurity: 99.1,
      minPriceInCents: 2999,
      latestBatchNumber: "LOT-2026-17",
    });
    expect(dbMock.product.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { categoryId: "cat_1", isActive: true },
      })
    );
  });

  it("fällt für leere Kategorien auf null-Werte zurück", async () => {
    dbMock.product.aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _min: { priceInCents: null },
    });
    dbMock.certificateOfAnalysis.aggregate.mockResolvedValue({
      _avg: { purity: null },
    });
    dbMock.certificateOfAnalysis.findFirst.mockResolvedValue(null);

    await expect(getCategoryStats("cat_leer")).resolves.toEqual({
      productCount: 0,
      avgPurity: null,
      minPriceInCents: null,
      latestBatchNumber: null,
    });
  });
});
