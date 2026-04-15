import type { DiscountType } from "@prisma/client";

/**
 * Pure helper that answers "can this promo code be applied right now?".
 *
 * Called from three places:
 *   - POST /api/promos/validate — user-facing "check my code" endpoint,
 *     uses the returned error string to tell the user why the code was
 *     rejected.
 *   - POST /api/stripe/checkout — silently drops a failing promo before
 *     creating the Stripe session (old behavior preserved; the UI
 *     already validated through /api/promos/validate first).
 *   - POST /api/checkout/bank-transfer — same silent drop pattern.
 *
 * By pulling the rules into one place we can unit-test them without
 * mocking Prisma, NextAuth, or the Stripe SDK, and the three call sites
 * can't drift apart again (they already drifted once — checkout silently
 * dropped expired codes while /api/promos/validate returned a specific
 * "expired" message).
 */

// Narrow subset of the PromoCode model — accepts anything that looks like
// one so it's easy to stub in tests without pulling in the full Prisma
// runtime type.
export interface PromoCodeLike {
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  minOrderCents: number | null;
  discountType: DiscountType;
  discountValue: number;
}

export interface PromoApplicabilityInput {
  promo: PromoCodeLike;
  /** Server-side clock. Pass `new Date()` in production code. */
  now: Date;
  subtotalInCents: number;
  /** Whether the current user has already redeemed this code (one-use-per-user). */
  alreadyUsedByUser: boolean;
}

export type PromoApplicabilityResult =
  | { applicable: true; discountInCents: number }
  | { applicable: false; reason: PromoRejectionReason; message: string };

// Named reasons for telemetry + case-analysis in tests. The `message`
// field stays human-readable for direct UI use.
export type PromoRejectionReason =
  | "inactive"
  | "not-yet-valid"
  | "expired"
  | "max-uses-reached"
  | "already-used-by-user"
  | "below-min-order";

/**
 * Returns the resolved discount in cents if the promo can be applied to
 * the given subtotal, or a descriptive rejection reason otherwise.
 *
 * The order of checks matches the audit recommendation: business rules
 * first (active, dates, quota), then user-specific rules (already-used),
 * then the cart-shape rule (min order). That order is important — it
 * means a user who re-applies an expired code sees "expired" rather
 * than "already used", which is the more actionable error.
 */
export function checkPromoApplicability(
  input: PromoApplicabilityInput
): PromoApplicabilityResult {
  const { promo, now, subtotalInCents, alreadyUsedByUser } = input;

  if (!promo.isActive) {
    return {
      applicable: false,
      reason: "inactive",
      message: "This promo code is no longer active",
    };
  }

  if (promo.startsAt && promo.startsAt > now) {
    return {
      applicable: false,
      reason: "not-yet-valid",
      message: "This promo code is not yet valid",
    };
  }

  if (promo.expiresAt && promo.expiresAt < now) {
    return {
      applicable: false,
      reason: "expired",
      message: "This promo code has expired",
    };
  }

  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return {
      applicable: false,
      reason: "max-uses-reached",
      message: "This promo code has reached its usage limit",
    };
  }

  if (alreadyUsedByUser) {
    return {
      applicable: false,
      reason: "already-used-by-user",
      message: "You have already used this promo code",
    };
  }

  if (promo.minOrderCents && subtotalInCents < promo.minOrderCents) {
    const minEur = (promo.minOrderCents / 100).toFixed(2);
    return {
      applicable: false,
      reason: "below-min-order",
      message: `Minimum order of ${minEur} EUR required for this code`,
    };
  }

  // Resolve the discount value. PERCENTAGE means discountValue is 1-100;
  // FIXED_AMOUNT means discountValue is already in cents. Both are
  // capped at the subtotal so the effective total never goes negative.
  const discountInCents =
    promo.discountType === "PERCENTAGE"
      ? Math.round((subtotalInCents * promo.discountValue) / 100)
      : Math.min(promo.discountValue, subtotalInCents);

  return { applicable: true, discountInCents };
}
