import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * getOrCreateStripeCoupon — race-safe Coupon-Erzeugung via Redis-Lock:
 *  - DB-Cache (stripeCouponId) ist der Fast-Path
 *  - Lock-Gewinner erstellt den Coupon und released den Lock
 *  - Lock-Verlierer pollt die DB auf das Ergebnis des Gewinners
 *  - Poll-Timeout und Redis-Ausfall → eigener Create (fail-open,
 *    Orphan-Risiko ist besser als Checkout-Fail)
 */
const { redisSetMock, redisDelMock, findUniqueMock, updateMock, couponCreateMock } =
  vi.hoisted(() => ({
    redisSetMock: vi.fn(),
    redisDelMock: vi.fn(),
    findUniqueMock: vi.fn(),
    updateMock: vi.fn(),
    couponCreateMock: vi.fn(),
  }));

vi.mock("@/lib/redis", () => ({
  redis: { set: redisSetMock, del: redisDelMock },
}));
vi.mock("@/lib/db", () => ({
  db: { promoCode: { findUnique: findUniqueMock, update: updateMock } },
}));
vi.mock("@/lib/stripe", () => ({
  stripe: { coupons: { create: couponCreateMock } },
}));

import { getOrCreateStripeCoupon } from "@/lib/stripe-coupon";

function promo(overrides: Record<string, unknown> = {}) {
  return {
    id: "promo_1",
    code: "Sommer10",
    discountType: "PERCENTAGE" as const,
    discountValue: 10,
    stripeCouponId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  redisSetMock.mockResolvedValue("OK");
  redisDelMock.mockResolvedValue(1);
  findUniqueMock.mockResolvedValue(null);
  updateMock.mockResolvedValue({});
  couponCreateMock.mockResolvedValue({ id: "coup_new" });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("getOrCreateStripeCoupon", () => {
  it("Fast-Path: gecachte stripeCouponId → kein Redis/Stripe-Roundtrip", async () => {
    const id = await getOrCreateStripeCoupon(
      promo({ stripeCouponId: "coup_cached" })
    );

    expect(id).toBe("coup_cached");
    expect(redisSetMock).not.toHaveBeenCalled();
    expect(couponCreateMock).not.toHaveBeenCalled();
  });

  it("Lock gewonnen: PERCENTAGE-Coupon, DB-Cache-Write, Lock-Release", async () => {
    const id = await getOrCreateStripeCoupon(promo());

    expect(id).toBe("coup_new");
    expect(redisSetMock).toHaveBeenCalledWith(
      "stripe:coupon:lock:sommer10",
      "1",
      "EX",
      30,
      "NX"
    );
    expect(couponCreateMock).toHaveBeenCalledWith({
      percent_off: 10,
      duration: "once",
      name: "Promo: SOMMER10",
    });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "promo_1" },
      data: { stripeCouponId: "coup_new" },
    });
    expect(redisDelMock).toHaveBeenCalledWith("stripe:coupon:lock:sommer10");
  });

  it("FIXED_AMOUNT → amount_off in EUR statt percent_off", async () => {
    await getOrCreateStripeCoupon(
      promo({ discountType: "FIXED_AMOUNT", discountValue: 500 })
    );

    expect(couponCreateMock).toHaveBeenCalledWith({
      amount_off: 500,
      currency: "eur",
      duration: "once",
      name: "Promo: SOMMER10",
    });
  });

  it("Lock-Release-Fehler wird geschluckt (TTL räumt auf), Resultat bleibt", async () => {
    redisDelMock.mockRejectedValue(new Error("redis gone"));

    await expect(getOrCreateStripeCoupon(promo())).resolves.toBe("coup_new");
  });

  it("Lock verloren: pollt DB und nutzt das Ergebnis des anderen Workers", async () => {
    vi.useFakeTimers();
    redisSetMock.mockResolvedValue(null); // NX-Set abgelehnt → anderer hält Lock
    findUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ stripeCouponId: "coup_other_worker" });

    const pending = getOrCreateStripeCoupon(promo());
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe("coup_other_worker");
    expect(couponCreateMock).not.toHaveBeenCalled();
    // Wer den Lock nie hatte, darf ihn auch nicht löschen.
    expect(redisDelMock).not.toHaveBeenCalled();
  });

  it("Poll-Timeout (6 Versuche) → eigener Create als Fallback", async () => {
    vi.useFakeTimers();
    redisSetMock.mockResolvedValue(null);
    findUniqueMock.mockResolvedValue(null); // anderer Worker schafft es nie

    const pending = getOrCreateStripeCoupon(promo());
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe("coup_new");
    expect(findUniqueMock).toHaveBeenCalledTimes(6);
    expect(couponCreateMock).toHaveBeenCalledTimes(1);
    expect(redisDelMock).not.toHaveBeenCalled();
  });

  it("Redis-Ausfall beim SETNX → fail-open, Coupon wird trotzdem erzeugt", async () => {
    vi.useFakeTimers();
    redisSetMock.mockRejectedValue(new Error("ECONNREFUSED"));
    findUniqueMock.mockResolvedValue(null);

    const pending = getOrCreateStripeCoupon(promo());
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe("coup_new");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Redis-Lock SETNX failed"),
      "ECONNREFUSED"
    );
  });
});
