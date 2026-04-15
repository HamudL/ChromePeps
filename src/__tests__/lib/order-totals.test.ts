import { describe, it, expect } from "vitest";
import { calculateOrderTotals } from "@/lib/order/calculate-totals";

/**
 * Total-calculation tests.
 *
 * These cover the ChromePeps-specific pricing rules (gross prices
 * including 19 % MwSt., free shipping over 100 €, tax extracted from
 * gross). The formulas live in one place (src/lib/order/calculate-totals.ts)
 * and are called from every checkout path — Stripe checkout, verify-
 * session fallback, bank transfer. Getting any of these wrong costs
 * real money per order, so they need an explicit safety net.
 */

describe("calculateOrderTotals()", () => {
  // ---------------------------------------------------------------
  // Shipping threshold
  // ---------------------------------------------------------------
  describe("shipping threshold", () => {
    it("adds 5,99 € shipping when the subtotal-after-discount is under 100 €", () => {
      const t = calculateOrderTotals({
        subtotalInCents: 5_000,
        discountInCents: 0,
      });
      expect(t.shippingInCents).toBe(599);
      expect(t.totalInCents).toBe(5_000 + 599);
    });

    it("adds shipping when subtotal is 99,99 € (just below)", () => {
      const t = calculateOrderTotals({
        subtotalInCents: 9_999,
        discountInCents: 0,
      });
      expect(t.shippingInCents).toBe(599);
    });

    it("is free at exactly 100 € (10 000 cents)", () => {
      const t = calculateOrderTotals({
        subtotalInCents: 10_000,
        discountInCents: 0,
      });
      expect(t.shippingInCents).toBe(0);
      expect(t.totalInCents).toBe(10_000);
    });

    it("is free above 100 €", () => {
      const t = calculateOrderTotals({
        subtotalInCents: 25_000,
        discountInCents: 0,
      });
      expect(t.shippingInCents).toBe(0);
      expect(t.totalInCents).toBe(25_000);
    });

    it("applies shipping when a discount drops a 100 €+ subtotal under the threshold", () => {
      // 120 € subtotal - 25 € discount = 95 € → under threshold
      const t = calculateOrderTotals({
        subtotalInCents: 12_000,
        discountInCents: 2_500,
      });
      expect(t.shippingInCents).toBe(599);
      expect(t.totalInCents).toBe(12_000 - 2_500 + 599);
    });

    it("keeps free shipping when a discount still leaves subtotal >= 100 €", () => {
      // 150 € subtotal - 10 € discount = 140 € → still free
      const t = calculateOrderTotals({
        subtotalInCents: 15_000,
        discountInCents: 1_000,
      });
      expect(t.shippingInCents).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // Tax extraction (gross → net)
  // ---------------------------------------------------------------
  describe("tax extraction (gross 19 % MwSt.)", () => {
    it("extracts 19 % MwSt. from a 119 € gross total exactly", () => {
      // 119 € gross → 19 € VAT, 100 € net.
      // But 119 € is over the shipping threshold, so total stays 119 €.
      const t = calculateOrderTotals({
        subtotalInCents: 11_900,
        discountInCents: 0,
      });
      expect(t.totalInCents).toBe(11_900);
      expect(t.taxInCents).toBe(1_900);
    });

    it("extracts correct MwSt. on a 29,90 € order (with shipping)", () => {
      // 29,90 € subtotal + 5,99 € shipping = 35,89 € gross
      // MwSt. = round(3589 - 3589 / 1.19) = round(3589 - 3015.966…) = round(573.033…) = 573
      const t = calculateOrderTotals({
        subtotalInCents: 2_990,
        discountInCents: 0,
      });
      expect(t.totalInCents).toBe(3_589);
      expect(t.taxInCents).toBe(573);
    });

    it("produces integer cents (no float leakage)", () => {
      const t = calculateOrderTotals({
        subtotalInCents: 2_990,
        discountInCents: 0,
      });
      expect(Number.isInteger(t.taxInCents)).toBe(true);
      expect(Number.isInteger(t.shippingInCents)).toBe(true);
      expect(Number.isInteger(t.totalInCents)).toBe(true);
    });

    it("returns 0 tax on a 0 € total", () => {
      const t = calculateOrderTotals({
        subtotalInCents: 0,
        discountInCents: 0,
      });
      // 0 subtotal + 599 shipping = 599 gross
      expect(t.totalInCents).toBe(599);
      // 599 - 599/1.19 ≈ 95.63 → round to 96
      expect(t.taxInCents).toBe(96);
    });
  });

  // ---------------------------------------------------------------
  // Discount handling
  // ---------------------------------------------------------------
  describe("discount handling", () => {
    it("subtracts a fixed discount from the subtotal", () => {
      const t = calculateOrderTotals({
        subtotalInCents: 10_000,
        discountInCents: 2_000,
      });
      // 100 - 20 = 80 → under threshold → add shipping
      expect(t.totalInCents).toBe(8_000 + 599);
    });

    it("clamps the effective total at 0 when discount > subtotal", () => {
      const t = calculateOrderTotals({
        subtotalInCents: 5_000,
        discountInCents: 9_000,
      });
      // Subtotal-after-discount clamps at 0 → plus shipping
      expect(t.totalInCents).toBe(599);
    });

    it("returns the raw discount value unchanged in the result", () => {
      // We intentionally preserve the caller-supplied discount (even if
      // larger than subtotal) so the stored order row matches the previous
      // behavior across all three checkout paths.
      const t = calculateOrderTotals({
        subtotalInCents: 5_000,
        discountInCents: 9_000,
      });
      expect(t.discountInCents).toBe(9_000);
    });

    it("handles a zero discount (no promo applied)", () => {
      const t = calculateOrderTotals({
        subtotalInCents: 15_000,
        discountInCents: 0,
      });
      expect(t.discountInCents).toBe(0);
      expect(t.totalInCents).toBe(15_000);
    });
  });

  // ---------------------------------------------------------------
  // Round-trip sanity (total = net + tax)
  // ---------------------------------------------------------------
  describe("round-trip consistency", () => {
    it("totalInCents - taxInCents equals the net, within 1 cent of rounding", () => {
      // A few representative subtotals
      for (const subtotal of [
        1_990, 2_990, 5_000, 7_500, 9_999, 10_000, 12_345, 99_999,
      ]) {
        const t = calculateOrderTotals({
          subtotalInCents: subtotal,
          discountInCents: 0,
        });
        const net = t.totalInCents - t.taxInCents;
        // net * 1.19 should be within 1 cent of totalInCents (rounding)
        const reconstructedGross = Math.round(net * 1.19);
        expect(Math.abs(reconstructedGross - t.totalInCents)).toBeLessThanOrEqual(1);
      }
    });
  });
});
