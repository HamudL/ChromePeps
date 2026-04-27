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
 *   - Shipping is variable per delivery country (resolved by the caller
 *     via lib/shipping/rates), passed in as `baseShippingInCents`. Free
 *     above 200 € (20 000 cents) gross order value EU-wide. The
 *     threshold is checked AFTER the discount has been applied.
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
// ("Gratis Versand ab 200 €"). Gilt EU-weit, NICHT pro Land.
export const FREE_SHIPPING_THRESHOLD_CENTS = 20_000;

// DE-Standard-Tarif, in cents. Bleibt als Konstante exportiert, weil
// Cart-Page + Marketing-Copy ("Versand ab 5,99 €") darauf referenzieren
// sollen, ohne pro Anzeige einen DB-Roundtrip zu machen. Der tatsächliche
// per-Order-Preis kommt aus lib/shipping/rates und wird hier als Param
// reingereicht.
export const STANDARD_SHIPPING_CENTS = 599;

export interface OrderTotalsInput {
  /** Sum of line-item prices × quantities, before any discount. */
  subtotalInCents: number;
  /** Total discount to subtract from the subtotal (fixed or percentage resolved). */
  discountInCents: number;
  /**
   * Versandtarif für das Lieferland, in cents (vom Caller via
   * `resolveShippingRate(countryCode)` aus lib/shipping/rates). Wird auf
   * 0 gesetzt, wenn der subtotalAfterDiscount die Free-Shipping-Schwelle
   * erreicht. Default ist STANDARD_SHIPPING_CENTS (DE-Tarif) — nur als
   * Backwards-Compat-Schutz für ältere Tests, neue Caller sollten den
   * Wert IMMER explizit übergeben.
   */
  baseShippingInCents?: number;
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
  const baseShipping = input.baseShippingInCents ?? STANDARD_SHIPPING_CENTS;
  const shippingInCents =
    subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : baseShipping;
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
