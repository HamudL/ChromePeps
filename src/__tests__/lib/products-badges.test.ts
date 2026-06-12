import { describe, it, expect } from "vitest";
import {
  computeProductBadges,
  NEW_PRODUCT_WINDOW_DAYS,
  LOW_STOCK_THRESHOLD,
  type BadgeInput,
} from "@/lib/products/badges";

/**
 * Badge-Logik der ProductCard: Priorität Sale > Bestseller > Neu >
 * Knapp, max. 2 sichtbare Badges, Out-of-Stock als exklusiver
 * Sonderfall.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function makeInput(overrides: Partial<BadgeInput> = {}): BadgeInput {
  return {
    priceInCents: 4999,
    compareAtPriceInCents: null,
    stock: 100,
    // Alt genug, dass "Neu" nicht greift.
    createdAt: new Date(Date.now() - (NEW_PRODUCT_WINDOW_DAYS + 5) * DAY_MS),
    ...overrides,
  };
}

describe("computeProductBadges", () => {
  it("zeigt NUR 'Ausverkauft' bei stock <= 0 — auch wenn Sale aktiv wäre", () => {
    const badges = computeProductBadges(
      makeInput({ stock: 0, compareAtPriceInCents: 9999, isBestseller: true })
    );
    expect(badges).toEqual([
      { kind: "out-of-stock", label: "Ausverkauft", tone: "muted" },
    ]);
  });

  it("behandelt negativen Bestand wie ausverkauft (Übersell-Anzeige)", () => {
    const badges = computeProductBadges(makeInput({ stock: -3 }));
    expect(badges.map((b) => b.kind)).toEqual(["out-of-stock"]);
  });

  it("zeigt 'Sale' nur wenn compareAtPrice ÜBER dem Preis liegt", () => {
    expect(
      computeProductBadges(
        makeInput({ priceInCents: 4999, compareAtPriceInCents: 5999 })
      ).map((b) => b.kind)
    ).toEqual(["sale"]);

    // Gleicher Preis ist kein Rabatt.
    expect(
      computeProductBadges(
        makeInput({ priceInCents: 4999, compareAtPriceInCents: 4999 })
      )
    ).toEqual([]);

    // null = kein Streichpreis.
    expect(
      computeProductBadges(makeInput({ compareAtPriceInCents: null }))
    ).toEqual([]);
  });

  it("zeigt 'Bestseller' wenn das Flag gesetzt ist", () => {
    expect(
      computeProductBadges(makeInput({ isBestseller: true })).map(
        (b) => b.kind
      )
    ).toEqual(["bestseller"]);
  });

  it("zeigt 'Neu' innerhalb des Fensters — akzeptiert Date UND ISO-String", () => {
    const recent = new Date(Date.now() - 2 * DAY_MS);
    expect(
      computeProductBadges(makeInput({ createdAt: recent })).map((b) => b.kind)
    ).toEqual(["new"]);
    expect(
      computeProductBadges(makeInput({ createdAt: recent.toISOString() })).map(
        (b) => b.kind
      )
    ).toEqual(["new"]);
  });

  it("zeigt KEIN 'Neu' außerhalb des Fensters", () => {
    const old = new Date(
      Date.now() - (NEW_PRODUCT_WINDOW_DAYS + 1) * DAY_MS
    );
    expect(computeProductBadges(makeInput({ createdAt: old }))).toEqual([]);
  });

  it("zeigt 'Nur noch wenige' bei 1..LOW_STOCK_THRESHOLD", () => {
    expect(
      computeProductBadges(makeInput({ stock: LOW_STOCK_THRESHOLD })).map(
        (b) => b.kind
      )
    ).toEqual(["low-stock"]);
    expect(
      computeProductBadges(makeInput({ stock: 1 })).map((b) => b.kind)
    ).toEqual(["low-stock"]);
    expect(
      computeProductBadges(makeInput({ stock: LOW_STOCK_THRESHOLD + 1 }))
    ).toEqual([]);
  });

  it("kappt bei 2 Badges in Prioritätsreihenfolge (Sale > Bestseller > Neu)", () => {
    const badges = computeProductBadges(
      makeInput({
        compareAtPriceInCents: 9999,
        isBestseller: true,
        createdAt: new Date(),
        stock: 2,
      })
    );
    expect(badges.map((b) => b.kind)).toEqual(["sale", "bestseller"]);
  });

  it("rückt nach wenn höher priorisierte Badges fehlen", () => {
    const badges = computeProductBadges(
      makeInput({ isBestseller: true, createdAt: new Date(), stock: 2 })
    );
    expect(badges.map((b) => b.kind)).toEqual(["bestseller", "new"]);
  });
});
