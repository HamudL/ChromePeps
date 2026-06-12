import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * getBestsellerProductIds: Top-N nach bezahlter Order-Menge, mit
 * Redis-Cache NUR für den Default-Cut (custom limit/window würde den
 * Default-Key vergiften) und Fail-Open auf leeres Set bei DB-Fehlern.
 */
const { dbMock, cacheGetMock, cacheSetMock } = vi.hoisted(() => ({
  dbMock: { orderItem: { groupBy: vi.fn() } },
  cacheGetMock: vi.fn(),
  cacheSetMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/redis", () => ({
  cacheGet: cacheGetMock,
  cacheSet: cacheSetMock,
}));

import { getBestsellerProductIds } from "@/lib/products/card";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/constants";
import {
  BESTSELLER_LIMIT,
  BESTSELLER_WINDOW_DAYS,
} from "@/lib/products/badges";

beforeEach(() => {
  vi.clearAllMocks();
  cacheGetMock.mockResolvedValue(null);
  cacheSetMock.mockResolvedValue(undefined);
});

describe("getBestsellerProductIds", () => {
  it("Cache-Hit (Default-Cut): Set aus dem Cache, kein groupBy", async () => {
    cacheGetMock.mockResolvedValue(["p1", "p2"]);
    const result = await getBestsellerProductIds();
    expect(result).toEqual(new Set(["p1", "p2"]));
    expect(dbMock.orderItem.groupBy).not.toHaveBeenCalled();
  });

  it("Cache-Miss: groupBy nur über SUCCEEDED-Orders im Fenster, dann cacheSet", async () => {
    dbMock.orderItem.groupBy.mockResolvedValue([
      { productId: "p1", _sum: { quantity: 10 } },
      { productId: "p2", _sum: { quantity: 7 } },
    ]);

    const result = await getBestsellerProductIds();
    expect(result).toEqual(new Set(["p1", "p2"]));

    const args = dbMock.orderItem.groupBy.mock.calls[0][0];
    expect(args.where.order.paymentStatus).toBe("SUCCEEDED");
    expect(args.take).toBe(BESTSELLER_LIMIT);
    // Fenster: createdAt >= (jetzt − BESTSELLER_WINDOW_DAYS).
    const since: Date = args.where.order.createdAt.gte;
    const expectedMs = Date.now() - BESTSELLER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    expect(Math.abs(since.getTime() - expectedMs)).toBeLessThan(5_000);

    expect(cacheSetMock).toHaveBeenCalledWith(
      CACHE_KEYS.BESTSELLER_IDS,
      ["p1", "p2"],
      CACHE_TTL.BESTSELLER_IDS
    );
  });

  it("filtert null-productIds (hart gelöschte Produkte) aus", async () => {
    dbMock.orderItem.groupBy.mockResolvedValue([
      { productId: "p1", _sum: { quantity: 5 } },
      { productId: null, _sum: { quantity: 3 } },
    ]);
    const result = await getBestsellerProductIds();
    expect(result).toEqual(new Set(["p1"]));
  });

  it("custom limit/window: umgeht den Cache komplett (Lese- UND Schreibseite)", async () => {
    dbMock.orderItem.groupBy.mockResolvedValue([
      { productId: "p9", _sum: { quantity: 1 } },
    ]);

    const result = await getBestsellerProductIds({ limit: 3 });
    expect(result).toEqual(new Set(["p9"]));
    expect(cacheGetMock).not.toHaveBeenCalled();
    expect(cacheSetMock).not.toHaveBeenCalled();
    expect(dbMock.orderItem.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
  });

  it("fail-open: DB-Fehler → leeres Set, Katalog rendert weiter", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    dbMock.orderItem.groupBy.mockRejectedValue(new Error("pg down"));
    const result = await getBestsellerProductIds();
    expect(result).toEqual(new Set());
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
