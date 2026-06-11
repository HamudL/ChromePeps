import { db } from "@/lib/db";
import type Stripe from "stripe";
import type { CartForOrder } from "@/lib/order/create-from-stripe";

/**
 * Resolve the cart-like object that `createOrderFromStripeSession`
 * needs, from a Stripe session + metadata.
 *
 * PRIMÄRE Quelle ist der `guestItems`-Metadata-Snapshot, den
 * /api/stripe/checkout beim Erstellen der Session stempelt — für
 * Gäste UND Auth-User. Das ist exakt die Item-Liste, die bepreist
 * und bezahlt wurde. Der Live-Cart des Users ist dafür ungeeignet:
 * zwischen Stripe-Redirect und Webhook (Sekunden bis Minuten) kann
 * der User den Cart in einem zweiten Tab mutieren — die Order
 * enthielte dann unbezahlte Items bzw. es fehlten bezahlte (TOCTOU).
 *
 *   - Auth-Orders: Items aus dem Snapshot; die Cart-Row wird nur
 *     noch nachgeschlagen, um ihre `id` fürs Leeren nach Order-
 *     Erstellung mitzugeben.
 *   - Gast-Orders: wie bisher Snapshot-only, ohne `id`.
 *   - Legacy-Fallback: Sessions ohne Snapshot (vor Phase 9 erstellt)
 *     lesen wie früher den Live-Cart.
 *
 * Sicherheit: Varianten werden nur akzeptiert, wenn sie wirklich zum
 * referenzierten Produkt gehören (`variant.productId === p`) — sonst
 * könnte ein manipulierter Checkout ein teures Produkt zum Preis der
 * Billig-Variante eines anderen Produkts kaufen.
 *
 * Returns null when:
 *   - weder Snapshot noch (für Auth) ein nicht-leerer Live-Cart
 *     existiert, ODER
 *   - der Snapshot nur auf gelöschte/fremde Produkte zeigt
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

  // ---------- Snapshot-Pfad (primär, Gast + Auth) ----------
  const fromSnapshot = await resolveFromMetadataSnapshot(stripeSession);
  if (fromSnapshot) {
    if (!userId) return fromSnapshot;
    // Auth: Cart-id fürs Leeren anhängen (falls die Row noch existiert).
    const cart = await db.cart.findUnique({
      where: { userId },
      select: { id: true },
    });
    return cart ? { ...fromSnapshot, id: cart.id } : fromSnapshot;
  }

  // ---------- Legacy-Fallback: Live-Cart (nur Auth) ----------
  // Erreicht nur Sessions, die VOR dem Snapshot-Stamping erstellt
  // wurden (oder deren Snapshot unlesbar ist). Bewusst beibehalten,
  // damit in-flight Checkouts über ein Deploy hinweg nicht stranden.
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
  }

  return null;
}

async function resolveFromMetadataSnapshot(
  stripeSession: Stripe.Checkout.Session
): Promise<CartForOrder | null> {
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
            productId: true,
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
    // Varianten-Mixing abwehren: Variante muss zum Produkt gehören.
    if (variant && variant.productId !== entry.p) return [];
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

  // Ohne `id` — der Caller entscheidet, ob ein Cart zu leeren ist.
  return { items };
}
