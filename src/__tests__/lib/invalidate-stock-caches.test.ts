import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * invalidateStockCaches muss nach jeder stock-verändernden Order-
 * Operation ALLE bestandsabhängigen Caches treffen — fehlt einer,
 * zeigen Listing/Detail/Homepage bis TTL-Ablauf veraltete
 * Verfügbarkeit (409er erst im Checkout).
 */
const { cacheDelMock, cacheDelPatternMock, revalidatePathMock } = vi.hoisted(
  () => ({
    cacheDelMock: vi.fn(),
    cacheDelPatternMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  })
);

vi.mock("@/lib/redis", () => ({
  cacheDel: cacheDelMock,
  cacheDelPattern: cacheDelPatternMock,
}));

// Seit dem PDP-ISR-Umbau invalidiert der Helper zusätzlich den Next-
// Full-Route-Cache — außerhalb eines Request-Kontexts würde das echte
// revalidatePath werfen (der Helper fängt das, aber der Mock macht die
// Aufruf-Assertion möglich).
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
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

  it("invalidiert den Next-Route-Cache aller PDPs (ISR)", async () => {
    await invalidateStockCaches();
    expect(revalidatePathMock).toHaveBeenCalledWith("/products/[slug]", "page");
  });

  it("bleibt fail-safe, wenn revalidatePath wirft (kein Request-Kontext)", async () => {
    revalidatePathMock.mockImplementation(() => {
      throw new Error("static generation store missing");
    });
    await expect(invalidateStockCaches()).resolves.toBeUndefined();
  });

  it("propagiert Fehler nicht doppelt: Helper verlässt sich auf graceful cacheDel*", async () => {
    // cacheDel/cacheDelPattern fangen Redis-Fehler intern — der Helper
    // selbst awaited nur. Resolved alles, resolved auch der Helper.
    await expect(invalidateStockCaches()).resolves.toBeUndefined();
  });
});
