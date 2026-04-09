/**
 * Pure badge helpers — NO "server-only" marker. This file is imported by
 * the ProductCard client component, so it must not pull in the DB client
 * or any other server-exclusive module.
 */

// Threshold configuration for badges.
export const NEW_PRODUCT_WINDOW_DAYS = 10;
export const LOW_STOCK_THRESHOLD = 5;
export const BESTSELLER_WINDOW_DAYS = 90;
export const BESTSELLER_LIMIT = 10;

export type ProductBadgeKind =
  | "sale"
  | "bestseller"
  | "new"
  | "low-stock"
  | "out-of-stock";

export interface ProductBadge {
  kind: ProductBadgeKind;
  label: string;
  /** Tailwind variant hint — the card picks the final visual style. */
  tone: "destructive" | "warning" | "success" | "info" | "muted";
}

export interface BadgeInput {
  priceInCents: number;
  compareAtPriceInCents: number | null;
  stock: number;
  createdAt: Date | string;
  isBestseller?: boolean;
}

/**
 * Computes up to two badges for a product, in priority order.
 *
 * Priority: Sale > Bestseller > Neu > Knapp. Out-of-Stock is handled
 * separately and is the only badge that renders when stock <= 0.
 */
export function computeProductBadges(input: BadgeInput): ProductBadge[] {
  const badges: ProductBadge[] = [];

  const isOutOfStock = input.stock <= 0;
  if (isOutOfStock) {
    badges.push({
      kind: "out-of-stock",
      label: "Ausverkauft",
      tone: "muted",
    });
    return badges;
  }

  const hasDiscount =
    input.compareAtPriceInCents !== null &&
    input.compareAtPriceInCents > input.priceInCents;
  if (hasDiscount) {
    badges.push({ kind: "sale", label: "Sale", tone: "destructive" });
  }

  if (input.isBestseller) {
    badges.push({ kind: "bestseller", label: "Bestseller", tone: "warning" });
  }

  const createdAt =
    typeof input.createdAt === "string"
      ? new Date(input.createdAt)
      : input.createdAt;
  const ageMs = Date.now() - createdAt.getTime();
  const isNew = ageMs < NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (isNew) {
    badges.push({ kind: "new", label: "Neu", tone: "success" });
  }

  const isLowStock = input.stock > 0 && input.stock <= LOW_STOCK_THRESHOLD;
  if (isLowStock) {
    badges.push({ kind: "low-stock", label: "Nur noch wenige", tone: "info" });
  }

  // Cap at 2 visible badges on the card to avoid visual clutter.
  return badges.slice(0, 2);
}
