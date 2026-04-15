import { describe, it, expect } from "vitest";
import {
  checkPromoApplicability,
  type PromoCodeLike,
} from "@/lib/order/promo-applicability";

/**
 * Tests for the shared promo applicability helper.
 *
 * This is the one place the validation rules live — three checkout
 * paths call this function (user-facing /api/promos/validate plus the
 * silent-drop variants inside stripe/checkout and bank-transfer). Any
 * bug here is a paid-for discount that should not have applied, or a
 * valid discount that was silently dropped and cost a customer money.
 */

// Test fixture: a valid, wide-open promo. Individual tests override
// the fields they care about and keep the rest sane.
function validPromo(overrides: Partial<PromoCodeLike> = {}): PromoCodeLike {
  return {
    isActive: true,
    startsAt: null,
    expiresAt: null,
    maxUses: null,
    usedCount: 0,
    minOrderCents: null,
    discountType: "FIXED_AMOUNT",
    discountValue: 1_000,
    ...overrides,
  };
}

const now = new Date("2026-04-15T12:00:00Z");

describe("checkPromoApplicability()", () => {
  // ---------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------
  describe("happy path", () => {
    it("applies a fixed-amount discount as-is when all rules pass", () => {
      const result = checkPromoApplicability({
        promo: validPromo({ discountType: "FIXED_AMOUNT", discountValue: 500 }),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: false,
      });
      expect(result).toEqual({ applicable: true, discountInCents: 500 });
    });

    it("applies a percentage discount rounded to whole cents", () => {
      const result = checkPromoApplicability({
        promo: validPromo({ discountType: "PERCENTAGE", discountValue: 20 }),
        now,
        subtotalInCents: 2_999, // 2_999 * 0.20 = 599.8 → 600
        alreadyUsedByUser: false,
      });
      expect(result).toEqual({ applicable: true, discountInCents: 600 });
    });

    it("caps a fixed discount at the subtotal (never over-discounts)", () => {
      const result = checkPromoApplicability({
        promo: validPromo({ discountType: "FIXED_AMOUNT", discountValue: 9_999 }),
        now,
        subtotalInCents: 3_000,
        alreadyUsedByUser: false,
      });
      expect(result).toEqual({ applicable: true, discountInCents: 3_000 });
    });
  });

  // ---------------------------------------------------------------
  // Rejection branches
  // ---------------------------------------------------------------
  describe("rejections", () => {
    it("rejects an inactive promo with reason 'inactive'", () => {
      const result = checkPromoApplicability({
        promo: validPromo({ isActive: false }),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: false,
      });
      expect(result).toMatchObject({ applicable: false, reason: "inactive" });
    });

    it("rejects a promo whose startsAt is in the future", () => {
      const result = checkPromoApplicability({
        promo: validPromo({
          startsAt: new Date("2026-05-01T00:00:00Z"),
        }),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: false,
      });
      expect(result).toMatchObject({
        applicable: false,
        reason: "not-yet-valid",
      });
    });

    it("accepts a promo whose startsAt is exactly now", () => {
      const result = checkPromoApplicability({
        promo: validPromo({ startsAt: now }),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: false,
      });
      expect(result.applicable).toBe(true);
    });

    it("rejects an expired promo", () => {
      const result = checkPromoApplicability({
        promo: validPromo({
          expiresAt: new Date("2026-03-01T00:00:00Z"),
        }),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: false,
      });
      expect(result).toMatchObject({ applicable: false, reason: "expired" });
    });

    it("accepts a promo whose expiresAt is exactly now (not yet strictly in the past)", () => {
      const result = checkPromoApplicability({
        promo: validPromo({ expiresAt: now }),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: false,
      });
      expect(result.applicable).toBe(true);
    });

    it("rejects a promo that hit its max uses", () => {
      const result = checkPromoApplicability({
        promo: validPromo({ maxUses: 100, usedCount: 100 }),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: false,
      });
      expect(result).toMatchObject({
        applicable: false,
        reason: "max-uses-reached",
      });
    });

    it("accepts a promo with one use left", () => {
      const result = checkPromoApplicability({
        promo: validPromo({ maxUses: 100, usedCount: 99 }),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: false,
      });
      expect(result.applicable).toBe(true);
    });

    it("treats null maxUses as unlimited", () => {
      const result = checkPromoApplicability({
        promo: validPromo({ maxUses: null, usedCount: 1_000_000 }),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: false,
      });
      expect(result.applicable).toBe(true);
    });

    it("rejects when the current user already redeemed the code", () => {
      const result = checkPromoApplicability({
        promo: validPromo(),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: true,
      });
      expect(result).toMatchObject({
        applicable: false,
        reason: "already-used-by-user",
      });
    });

    it("rejects a subtotal below the minimum order requirement", () => {
      const result = checkPromoApplicability({
        promo: validPromo({ minOrderCents: 10_000 }),
        now,
        subtotalInCents: 9_999,
        alreadyUsedByUser: false,
      });
      expect(result).toMatchObject({
        applicable: false,
        reason: "below-min-order",
      });
      if (!result.applicable) {
        expect(result.message).toContain("100.00");
      }
    });

    it("accepts a subtotal exactly at the minimum order requirement", () => {
      const result = checkPromoApplicability({
        promo: validPromo({ minOrderCents: 10_000 }),
        now,
        subtotalInCents: 10_000,
        alreadyUsedByUser: false,
      });
      expect(result.applicable).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // Check ordering — make sure the most actionable error wins
  // ---------------------------------------------------------------
  describe("check ordering", () => {
    it("reports 'expired' (not 'already-used-by-user') when both apply", () => {
      const result = checkPromoApplicability({
        promo: validPromo({
          expiresAt: new Date("2026-03-01T00:00:00Z"),
        }),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: true,
      });
      expect(result).toMatchObject({ applicable: false, reason: "expired" });
    });

    it("reports 'inactive' before any other check fires", () => {
      const result = checkPromoApplicability({
        promo: validPromo({
          isActive: false,
          expiresAt: new Date("2026-03-01T00:00:00Z"),
          maxUses: 1,
          usedCount: 1,
        }),
        now,
        subtotalInCents: 5_000,
        alreadyUsedByUser: true,
      });
      expect(result).toMatchObject({ applicable: false, reason: "inactive" });
    });
  });
});
