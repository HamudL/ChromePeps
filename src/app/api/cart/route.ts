import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { syncCartSchema } from "@/validators/cart";

/**
 * /api/cart — bewusst NUR ein PUT-Handler.
 *
 * Der Warenkorb lebt clientseitig im Zustand-Store (localStorage-persistiert,
 * src/store/cart-store.ts); alle Cart-Mutationen (add/remove/update) passieren
 * dort ohne Server-Roundtrip. Der Server braucht den Cart nur EINMAL: beim
 * Checkout synct die Checkout-Page (syncCartToServer) den kompletten Client-
 * Cart per PUT als Full-Replace in die DB, damit Stripe-/Vorkasse-Routen
 * server-validierte Items vorfinden.
 *
 * Die früheren GET/POST/PATCH-Handler (Server-Cart lesen, Item hinzufügen,
 * Menge ändern) hatten keinerlei Aufrufer mehr und wurden entfernt. Mit GET
 * verschwand auch der einzige Leser UND Schreiber des Redis-Cart-Caches
 * (CACHE_KEYS.CART) — der Cache wurde deshalb komplett ausgebaut, inklusive
 * aller cacheDel-Invalidierungen in den Order-/Produkt-Routen, die nur noch
 * einen nie existierenden Key gelöscht hätten.
 */

// PUT /api/cart — sync client cart to server (full replace)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Full-Replace ist der teuerste Cart-Pfad (Batch-Lookups + Transaction)
  // — eigener, etwas engerer Bucket.
  const limit = await rateLimit(`cart-sync:${session.user.id}`, {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const body = await parseJsonBody(req);
  const parsed = syncCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // Upsert cart
  const cart = await db.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  // Batch-validate every product and variant in two queries instead of
  // running a findUnique per item. Previously, syncing a 10-item cart meant
  // up to ~30 sequential DB round-trips (product lookup, variant lookup,
  // deleteMany, then one create per item).
  const productIds = Array.from(
    new Set(parsed.data.items.map((i) => i.productId))
  );
  const variantIds = parsed.data.items
    .map((i) => i.variantId)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const [products, variants] = await Promise.all([
    productIds.length > 0
      ? db.product.findMany({
          where: { id: { in: productIds }, isActive: true },
          select: { id: true, stock: true },
        })
      : Promise.resolve([]),
    variantIds.length > 0
      ? db.productVariant.findMany({
          where: { id: { in: variantIds }, isActive: true },
          select: { id: true, productId: true, stock: true },
        })
      : Promise.resolve([]),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const validatedItems = parsed.data.items.flatMap((item) => {
    const product = productMap.get(item.productId);
    if (!product) return []; // skip invalid / inactive products

    if (item.variantId) {
      const variant = variantMap.get(item.variantId);
      if (!variant) return []; // skip invalid / inactive variants
      // Varianten-Mixing abwehren — Fremd-Varianten still droppen,
      // konsistent mit dem Silent-Drop-Verhalten dieses Sync-Endpoints.
      if (variant.productId !== item.productId) return [];
      const quantity = Math.min(item.quantity, 99, variant.stock);
      if (quantity <= 0) return [];
      return [
        {
          productId: item.productId,
          variantId: item.variantId,
          quantity,
        },
      ];
    }

    const quantity = Math.min(item.quantity, 99, product.stock);
    if (quantity <= 0) return [];
    return [
      {
        productId: item.productId,
        variantId: null as string | null,
        quantity,
      },
    ];
  });

  // Clear existing items and replace with the validated client cart in a
  // single atomic transaction. Without the transaction, a crash between
  // deleteMany and createMany would leave the user with an empty cart.
  await db.$transaction([
    db.cartItem.deleteMany({ where: { cartId: cart.id } }),
    ...(validatedItems.length > 0
      ? [
          db.cartItem.createMany({
            data: validatedItems.map((i) => ({
              cartId: cart.id,
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
            })),
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ success: true });
}
