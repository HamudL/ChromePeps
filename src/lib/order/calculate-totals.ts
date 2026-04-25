/**
 * Pure total-calculation helper used by every checkout path
 * (Stripe checkout, verify-session fallback, bank transfer).
 *
 * Why pure? The formulas here were duplicated across three routes and
 * had already drifted once (the previous verify-session code was less
 * strict about stock than the webhook). Extracting the math here keeps
 * the three entry points consistent and makes the arithmetic unit-
 * testable without having to mock Prisma, Stripe, or next-auth.
 *
 * Pricing rules, hardcoded because they're part of the ChromePeps
 * business model and rarely change:
 *   - All stored prices are gross (inkl. 19 % MwSt.).
 *   - Shipping is 5,99 € (599 cents) under 200 € (20 000 cents) gross
 *     order value, free above. The threshold is checked AFTER the
 *     discount has been applied, i.e. "was the customer actually
 *     charged at least 200 €?".
 *   - MwSt. is extracted from the gross total, never added on top:
 *     `taxInCents = round(total - total / 1.19)`. This is the amount
 *     of tax that's already baked into the price the customer paid.
 *   - Discount never exceeds the subtotal (no negative totals).
 */

// 19 % German VAT. Kept as a constant so the tax-extraction formula and
// any future tax-rate tests reference the exact same number.
export const TAX_MULTIPLIER = 1.19;
export const TAX_RATE = 0.19;

// Free-shipping threshold, in cents. Tied to the hero marketing copy
// ("Gratis Versand ab 200 €").
export const FREE_SHIPPING_THRESHOLD_CENTS = 20_000;

// Flat shipping fee under the free-shipping threshold, in cents.
export const STANDARD_SHIPPING_CENTS = 599;

export interface OrderTotalsInput {
  /** Sum of line-item prices × quantities, before any discount. */
  subtotalInCents: number;
  /** Total discount to subtract from the subtotal (fixed or percentage resolved). */
  discountInCents: number;
}

export interface OrderTotals {
  subtotalInCents: number;
  discountInCents: number;
  shippingInCents: number;
  /** The amount the customer is charged (gross, incl. MwSt.). */
  totalInCents: number;
  /** The portion of `totalInCents` that is German VAT at 19 %. */
  taxInCents: number;
}

/**
 * Given a cart subtotal and an already-resolved discount amount, derive
 * the final totals that go onto the order record.
 *
 * Guarantees:
 *   - subtotalInCents - discountInCents is clamped at 0 (never negative).
 *   - shippingInCents is exactly STANDARD_SHIPPING_CENTS or 0.
 *   - totalInCents = subtotalAfterDiscount + shippingInCents.
 *   - taxInCents = round(totalInCents - totalInCents / 1.19), so
 *     totalInCents - taxInCents is the net (netto) amount.
 *   - All returned numbers are integers (cents).
 */
export function calculateOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotalAfterDiscount = Math.max(
    0,
    input.subtotalInCents - input.discountInCents
  );
  const shippingInCents =
    subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD_CENTS
      ? 0
      : STANDARD_SHIPPING_CENTS;
  const totalInCents = subtotalAfterDiscount + shippingInCents;
  const taxInCents = Math.round(totalInCents - totalInCents / TAX_MULTIPLIER);

  return {
    subtotalInCents: input.subtotalInCents,
    // Discount auf subtotal clampen — totalInCents war immer schon
    // korrekt (Math.max(0, ...) oben), aber das stored discount-Feld
    // sollte niemals größer als subtotal sein, sonst zeigt die
    // Rechnung "Rabatt: 100€ / Zwischensumme: 50€" und die
    // Buchhaltungs-Exports summieren inkonsistente Zahlen.
    discountInCents: Math.min(input.discountInCents, input.subtotalInCents),
    shippingInCents,
    totalInCents,
    taxInCents,
  };
}
