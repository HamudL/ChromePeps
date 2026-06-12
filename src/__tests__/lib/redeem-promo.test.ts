import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Prisma } from "@prisma/client";
import { redeemPromo } from "@/lib/order/redeem-promo";

/**
 * redeemPromo — zwei Semantiken, ein Helper:
 *  - "strict" (Vorkasse, PRE-payment): usedCount-CAS gegen maxUses,
 *    bei Erschöpfung Error("PROMO_EXHAUSTED"); P2002 vom Unique-Index
 *    propagiert ungefangen zum Caller.
 *  - "bestEffort" (Stripe, POST-payment): Pre-Check statt Throw —
 *    vorhandene Einlösung darf die bezahlte Order nicht kippen.
 *
 * tx wird als Stub gemockt (Transaktions-Client-Interface).
 */
const promoUsageFindFirst = vi.fn();
const promoUsageCreate = vi.fn();
const promoCodeUpdate = vi.fn();
const promoCodeUpdateMany = vi.fn();

function makeTx(): Prisma.TransactionClient {
  return {
    promoUsage: {
      findFirst: promoUsageFindFirst,
      create: promoUsageCreate,
    },
    promoCode: {
      update: promoCodeUpdate,
      updateMany: promoCodeUpdateMany,
    },
  } as unknown as Prisma.TransactionClient;
}

const baseArgs = {
  promoId: "promo_1",
  userId: "user_1" as string | null,
  guestEmail: null as string | null,
  orderId: "order_1",
  discountInCents: 500,
  maxUses: null as number | null,
};

beforeEach(() => {
  vi.clearAllMocks();
  promoUsageFindFirst.mockResolvedValue(null);
  promoUsageCreate.mockResolvedValue({ id: "usage_1" });
  promoCodeUpdate.mockResolvedValue({});
  promoCodeUpdateMany.mockResolvedValue({ count: 1 });
});

describe("redeemPromo — bestEffort (Stripe, POST-payment)", () => {
  it("vorhandene Einlösung → redeemed:false, KEIN zweiter Create/Increment", async () => {
    promoUsageFindFirst.mockResolvedValue({ id: "usage_existing" });

    const result = await redeemPromo(makeTx(), {
      ...baseArgs,
      mode: "bestEffort",
    });

    expect(result).toEqual({ redeemed: false });
    expect(promoUsageCreate).not.toHaveBeenCalled();
    expect(promoCodeUpdate).not.toHaveBeenCalled();
  });

  it("Auth-User: Pre-Check matcht auf userId, Create setzt guestEmail null", async () => {
    const result = await redeemPromo(makeTx(), {
      ...baseArgs,
      guestEmail: "soll-ignoriert-werden@example.com",
      mode: "bestEffort",
    });

    expect(result).toEqual({ redeemed: true });
    expect(promoUsageFindFirst).toHaveBeenCalledWith({
      where: { promoId: "promo_1", userId: "user_1" },
      select: { id: true },
    });
    expect(promoUsageCreate).toHaveBeenCalledWith({
      data: {
        promoId: "promo_1",
        userId: "user_1",
        guestEmail: null,
        orderId: "order_1",
        discountAmount: 500,
      },
    });
    // Increment ohne maxUses-CAS — Limit wurde beim Session-Create geprüft.
    expect(promoCodeUpdate).toHaveBeenCalledWith({
      where: { id: "promo_1" },
      data: { usedCount: { increment: 1 } },
    });
  });

  it("Gast: Pre-Check matcht auf guestEmail", async () => {
    await redeemPromo(makeTx(), {
      ...baseArgs,
      userId: null,
      guestEmail: "gast@example.com",
      mode: "bestEffort",
    });

    expect(promoUsageFindFirst).toHaveBeenCalledWith({
      where: { promoId: "promo_1", guestEmail: "gast@example.com" },
      select: { id: true },
    });
    expect(promoUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        guestEmail: "gast@example.com",
      }),
    });
  });

  it("Gast ohne E-Mail: Pre-Check fällt auf Leerstring zurück (kein Prisma-null-where)", async () => {
    await redeemPromo(makeTx(), {
      ...baseArgs,
      userId: null,
      guestEmail: null,
      mode: "bestEffort",
    });

    expect(promoUsageFindFirst).toHaveBeenCalledWith({
      where: { promoId: "promo_1", guestEmail: "" },
      select: { id: true },
    });
  });
});

describe("redeemPromo — strict (Vorkasse, PRE-payment)", () => {
  it("maxUses gesetzt → CAS-Filter usedCount < maxUses im updateMany", async () => {
    const result = await redeemPromo(makeTx(), {
      ...baseArgs,
      maxUses: 10,
      mode: "strict",
    });

    expect(result).toEqual({ redeemed: true });
    expect(promoCodeUpdateMany).toHaveBeenCalledWith({
      where: { id: "promo_1", usedCount: { lt: 10 } },
      data: { usedCount: { increment: 1 } },
    });
    // strict macht KEINEN Pre-Check — die DB-Uniques sind die Wache.
    expect(promoUsageFindFirst).not.toHaveBeenCalled();
  });

  it("maxUses null → Increment ohne usedCount-Filter (unbegrenzter Code)", async () => {
    await redeemPromo(makeTx(), {
      ...baseArgs,
      maxUses: null,
      mode: "strict",
    });

    expect(promoCodeUpdateMany).toHaveBeenCalledWith({
      where: { id: "promo_1" },
      data: { usedCount: { increment: 1 } },
    });
  });

  it("CAS-Miss (count 0) → Error PROMO_EXHAUSTED", async () => {
    promoCodeUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      redeemPromo(makeTx(), { ...baseArgs, maxUses: 5, mode: "strict" })
    ).rejects.toThrow("PROMO_EXHAUSTED");
  });

  it("Gast-Einlösung schreibt guestEmail statt userId", async () => {
    await redeemPromo(makeTx(), {
      ...baseArgs,
      userId: null,
      guestEmail: "gast@example.com",
      mode: "strict",
    });

    expect(promoUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        guestEmail: "gast@example.com",
      }),
    });
  });

  it("P2002 (Doppel-Einlösung unter Nebenläufigkeit) propagiert zum Caller", async () => {
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    promoUsageCreate.mockRejectedValue(p2002);

    await expect(
      redeemPromo(makeTx(), { ...baseArgs, mode: "strict" })
    ).rejects.toMatchObject({ code: "P2002" });
    // Increment darf nach dem gescheiterten Create nicht mehr laufen.
    expect(promoCodeUpdateMany).not.toHaveBeenCalled();
  });
});
