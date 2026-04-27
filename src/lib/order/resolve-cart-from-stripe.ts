import { db } from "@/lib/db";
import type Stripe from "stripe";
import type { CartForOrder } from "@/lib/order/create-from-stripe";

/**
 * Resolve the cart-like object that `createOrderFromStripeSession`
 * needs, from a Stripe session + metadata.
 *
 *   - Authenticated orders: read the user's Cart row from the DB
 *     and return it with its id (so the caller's transaction can
 *     clear it after the order is committed).
 *
 *   - Guest orders: no server-side cart exists. The checkout route
 *     stamped a compact `guestItems` JSON blob into the session
 *     metadata (see src/app/api/stripe/checkout/route.ts). We
 *     parse that blob, look up the referenced products + variants,
 *     and return a synthetic cart without an `id` (so the caller
 *     knows there's nothing to clear).
 *
 * Returns null when:
 *   - the order type is guest but `guestItems` metadata is missing
 *     or malformed, OR
 *   - the order type is user but the user's Cart row has no items
 *
 * Callers should treat null as "payment landed but the cart was
 * empty / stale" and either short-circuit (the webhook does — it
 * assumes the verify-session fallback beat it to the order) or
 * surface an error to the user (verify-session does).
 */
export async function resolveCartFromStripeSession(
  stripeSession: Stripe.Checkout.Session
): Promise<CartForOrder | null> {
  const userId = stripeSession.metadata?.userId;

  // ---------- Authenticated order ----------
  if (userId) {
    const cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true, variant: true },
        },
      },
    });
    if (cart && cart.items.length > 0) {
      return {
        id: cart.id,
        items: cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          product: {
            name: item.product.name,
            sku: item.product.sku,
            priceInCents: item.product.priceInCents,
          },
          variant: item.variant
            ? {
                name: item.variant.name,
                sku: item.variant.sku,
                priceInCents: item.variant.priceInCents,
              }
            : null,
        })),
      };
    }
    // Cart fehlt — typischer Fall: User hat sein Konto nach dem
    // Stripe-Redirect gelöscht, Cascade hat den Cart entfernt. Fall
    // through zum metadata-Snapshot-Fallback unten, der seit Phase 9
    // auch für Auth-User gestempelt wird.
  }

  // ---------- Guest order / Auth-Recovery ----------
  // Kein guestEmail-Check mehr — der Auth-Recovery-Pfad triggert
  // diesen Block ohne guestEmail in der metadata. Identifikation
  // läuft dann über stripeSession.customer_details/email im
  // Order-Helper; hier rekonstruieren wir nur die Items.
  const rawItemsJson = stripeSession.metadata?.guestItems;
  if (typeof rawItemsJson !== "string" || !rawItemsJson) return null;

  let parsed: Array<{ p: string; v: string | null; q: number }>;
  try {
    const arr = JSON.parse(rawItemsJson);
    if (!Array.isArray(arr)) return null;
    parsed = arr.flatMap((entry) => {
      if (
        typeof entry?.p === "string" &&
        typeof entry.q === "number" &&
        entry.q > 0 &&
        (entry.v === null || typeof entry.v === "string")
      ) {
        return [
          {
            p: entry.p,
            v: typeof entry.v === "string" && entry.v ? entry.v : null,
            q: Math.floor(entry.q),
          },
        ];
      }
      return [];
    });
  } catch {
    return null;
  }
  if (parsed.length === 0) return null;

  const productIds = Array.from(new Set(parsed.map((e) => e.p)));
  const variantIds = Array.from(
    new Set(parsed.map((e) => e.v).filter((v): v is string => !!v))
  );

  const [products, variants] = await Promise.all([
    db.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        priceInCents: true,
      },
    }),
    variantIds.length
      ? db.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            name: true,
            sku: true,
            priceInCents: true,
          },
        })
      : Promise.resolve([]),
  ]);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const items = parsed.flatMap((entry) => {
    const product = productMap.get(entry.p);
    if (!product) return [];
    const variant = entry.v ? variantMap.get(entry.v) ?? null : null;
    if (entry.v && !variant) return [];
    return [
      {
        productId: entry.p,
        variantId: entry.v,
        quantity: entry.q,
        product: {
          name: product.name,
          sku: product.sku,
          priceInCents: product.priceInCents,
        },
        variant: variant
          ? {
              name: variant.name,
              sku: variant.sku,
              priceInCents: variant.priceInCents,
            }
          : null,
      },
    ];
  });

  if (items.length === 0) return null;

  // No `id` — signals "no server-side cart to clear".
  return { items };
}
