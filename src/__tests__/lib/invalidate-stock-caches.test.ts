import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * invalidateStockCaches muss nach jeder stock-verändernden Order-
 * Operation ALLE bestandsabhängigen Caches treffen — fehlt einer,
 * zeigen Listing/Detail/Homepage bis TTL-Ablauf veraltete
 * Verfügbarkeit (409er erst im Checkout).
 */
const { cacheDelMock, cacheDelPatternMock } = vi.hoisted(() => ({
  cacheDelMock: vi.fn(),
  cacheDelPatternMock: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  cacheDel: cacheDelMock,
  cacheDelPattern: cacheDelPatternMock,
}));

import { invalidateStockCaches } from "@/lib/order/invalidate-stock-caches";
import { CACHE_KEYS, HOMEPAGE_CACHE } from "@/lib/constants";

beforeEach(() => {
  vi.clearAllMocks();
  cacheDelMock.mockResolvedValue(undefined);
  cacheDelPatternMock.mockResolvedValue(undefined);
});

describe("invalidateStockCaches", () => {
  it("löscht Listen-, Detail-, Bestseller- und Homepage-Caches", async () => {
    await invalidateStockCaches();

    expect(cacheDelPatternMock).toHaveBeenCalledWith(
      `${CACHE_KEYS.PRODUCTS_LIST}:*`
    );
    expect(cacheDelPatternMock).toHaveBeenCalledWith("products:detail:*");
    expect(cacheDelMock).toHaveBeenCalledWith(CACHE_KEYS.BESTSELLER_IDS);
    expect(cacheDelMock).toHaveBeenCalledWith(HOMEPAGE_CACHE.BESTSELLERS);
    expect(cacheDelPatternMock).toHaveBeenCalledTimes(2);
    expect(cacheDelMock).toHaveBeenCalledTimes(2);
  });

  it("propagiert Fehler nicht doppelt: Helper verlässt sich auf graceful cacheDel*", async () => {
    // cacheDel/cacheDelPattern fangen Redis-Fehler intern — der Helper
    // selbst awaited nur. Resolved alles, resolved auch der Helper.
    await expect(invalidateStockCaches()).resolves.toBeUndefined();
  });
});
