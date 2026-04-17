import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/utils";
import { checkPromoApplicability } from "@/lib/order/promo-applicability";

/**
 * POST /api/stripe/checkout — create a Stripe Checkout Session.
 *
 * Accepts TWO request shapes:
 *
 *   A) Authenticated user, saved address + server-side cart:
 *      { shippingAddressId: string, promoCode?: string }
 *
 *   B) Guest checkout (no session):
 *      {
 *        guestEmail: string,
 *        guestName: string,
 *        shippingAddress: { firstName, lastName, street, street2?,
 *                           city, postalCode, country, phone?, company? },
 *        items: Array<{ productId, variantId?, quantity }>,
 *        promoCode?: string,
 *      }
 *
 * For guest orders the `guestEmail`, `guestName`, and
 * `shippingAddressId` are stamped into the Stripe session metadata
 * so that the downstream `/api/stripe/webhook` and
 * `/api/stripe/verify-session` handlers can recover that context
 * without talking to our session store.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isGuest = !userId;

  const body = await req.json();
  const promoCode: string | null = body.promoCode ?? null;

  // Rate-limit. Per-identity (tight) + per-IP (defense in depth).
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0].trim() ?? "unknown";
  const ipLimit = await rateLimit(`stripe:ip:${ip}`, {
    maxRequests: 15,
    windowMs: 60_000,
  });
  if (!ipLimit.success) return rateLimitExceeded(ipLimit);

  if (userId) {
    const userLimit = await rateLimit(`stripe:${userId}`, {
      maxRequests: 5,
      windowMs: 60_000,
    });
    if (!userLimit.success) return rateLimitExceeded(userLimit);
  }

  // Build line items + subtotal differently for each mode.
  type LineItem = {
    price_data: {
      currency: "eur";
      product_data: { name: string; images: string[] };
      unit_amount: number;
    };
    quantity: number;
  };
  const lineItems: LineItem[] = [];
  let subtotalInCents = 0;
  let shippingAddressId: string;
  let customerEmail: string | undefined;
  let guestEmailForOrder: string | null = null;
  let guestNameForOrder: string | null = null;
  // JSON blob of guest cart items (productId, variantId, quantity)
  // — populated only for guest orders, stamped into Stripe session
  // metadata so the webhook + verify-session can recover the items
  // without a server-side cart row.
  let guestItemsMeta: string | null = null;

  if (isGuest) {
    const rawGuestEmail =
      typeof body.guestEmail === "string" ? body.guestEmail.trim().toLowerCase() : "";
    const rawGuestName =
      typeof body.guestName === "string" ? body.guestName.trim() : "";
    const guestShipping = body.shippingAddress;
    const guestItems: Array<{
      productId: unknown;
      variantId?: unknown;
      quantity: unknown;
    }> = Array.isArray(body.items) ? body.items : [];

    if (!rawGuestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawGuestEmail)) {
      return NextResponse.json(
        { success: false, error: "Bitte eine gültige E-Mail-Adresse angeben." },
        { status: 400 }
      );
    }
    if (!rawGuestName) {
      return NextResponse.json(
        { success: false, error: "Bitte einen Namen angeben." },
        { status: 400 }
      );
    }
    if (
      !guestShipping ||
      typeof guestShipping.firstName !== "string" ||
      typeof guestShipping.lastName !== "string" ||
      typeof guestShipping.street !== "string" ||
      typeof guestShipping.city !== "string" ||
      typeof guestShipping.postalCode !== "string" ||
      typeof guestShipping.country !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Lieferadresse unvollständig." },
        { status: 400 }
      );
    }
    if (guestItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cart is empty" },
        { status: 400 }
      );
    }

    // Resolve products/variants from DB (client supplies ids only).
    const productIds = Array.from(
      new Set(
        guestItems
          .map((i) => (typeof i.productId === "string" ? i.productId : ""))
          .filter((s) => s)
      )
    );
    const variantIds = Array.from(
      new Set(
        guestItems
          .map((i) => (typeof i.variantId === "string" ? i.variantId : ""))
          .filter((s) => s)
      )
    );
    const [products, variants] = await Promise.all([
      productIds.length
        ? db.product.findMany({
            where: { id: { in: productIds }, isActive: true },
            select: {
              id: true,
              name: true,
              priceInCents: true,
              stock: true,
              images: { select: { url: true }, take: 1 },
            },
          })
        : Promise.resolve([]),
      variantIds.length
        ? db.productVariant.findMany({
            where: { id: { in: variantIds }, isActive: true },
            select: {
              id: true,
              name: true,
              priceInCents: true,
              stock: true,
            },
          })
        : Promise.resolve([]),
    ]);
    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    for (const rawItem of guestItems) {
      const pid =
        typeof rawItem.productId === "string" ? rawItem.productId : "";
      const vid =
        typeof rawItem.variantId === "string" ? rawItem.variantId : null;
      const qty =
        typeof rawItem.quantity === "number" && rawItem.quantity > 0
          ? Math.floor(rawItem.quantity)
          : 0;
      if (!pid || qty <= 0) continue;
      const product = productMap.get(pid);
      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: "Mindestens ein Produkt im Warenkorb ist nicht mehr verfügbar.",
          },
          { status: 400 }
        );
      }
      const variant = vid ? variantMap.get(vid) ?? null : null;
      if (vid && !variant) {
        return NextResponse.json(
          {
            success: false,
            error: "Die gewählte Variante ist nicht mehr verfügbar.",
          },
          { status: 400 }
        );
      }
      const availableStock = variant?.stock ?? product.stock;
      if (availableStock < qty) {
        return NextResponse.json(
          {
            success: false,
            error: `Nicht genug Lagerbestand für "${product.name}${
              variant ? ` (${variant.name})` : ""
            }".`,
          },
          { status: 400 }
        );
      }
      const unitAmount = variant?.priceInCents ?? product.priceInCents;
      const productName = variant
        ? `${product.name} (${variant.name})`
        : product.name;
      subtotalInCents += unitAmount * qty;
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: productName,
            images: product.images[0]?.url
              ? [absoluteUrl(product.images[0].url)]
              : [],
          },
          unit_amount: unitAmount,
        },
        quantity: qty,
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cart is empty" },
        { status: 400 }
      );
    }

    // Stripe's session metadata is the only channel that reliably
    // survives the redirect → payment → webhook journey. For guest
    // orders there's no Cart row to read in the webhook, so we
    // pack the product + quantity ids into a compact JSON blob
    // here and parse it back in /api/stripe/webhook + verify-
    // session. Stripe's per-value limit is 500 chars. A reasonable
    // shop cart (≤10 items, cuid ids ~25 chars each) fits
    // comfortably; we cap at a safe upper bound below.
    guestItemsMeta = JSON.stringify(
      lineItems.map((_li, idx) => {
        // Recover the productId/variantId/quantity from the
        // original request body — lineItems itself only carries
        // display info.
        const raw = body.items[idx];
        return {
          p: typeof raw?.productId === "string" ? raw.productId : "",
          v: typeof raw?.variantId === "string" ? raw.variantId : null,
          q:
            typeof raw?.quantity === "number" && raw.quantity > 0
              ? Math.floor(raw.quantity)
              : 1,
        };
      })
    );
    if (guestItemsMeta.length > 490) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Warenkorb hat zu viele Positionen für einen Gast-Checkout. Bitte Login für größere Bestellungen.",
        },
        { status: 400 }
      );
    }

    // Persist the guest shipping address. The webhook needs the id
    // in the session metadata and the row will be reused when the
    // order is actually created.
    const address = await db.address.create({
      data: {
        userId: null,
        firstName: guestShipping.firstName,
        lastName: guestShipping.lastName,
        company:
          typeof guestShipping.company === "string" && guestShipping.company
            ? guestShipping.company
            : null,
        street: guestShipping.street,
        street2:
          typeof guestShipping.street2 === "string" && guestShipping.street2
            ? guestShipping.street2
            : null,
        city: guestShipping.city,
        postalCode: guestShipping.postalCode,
        country: guestShipping.country,
        phone:
          typeof guestShipping.phone === "string" && guestShipping.phone
            ? guestShipping.phone
            : null,
      },
    });
    shippingAddressId = address.id;
    customerEmail = rawGuestEmail;
    guestEmailForOrder = rawGuestEmail;
    guestNameForOrder = rawGuestName;
  } else {
    const rawAddressId = body.shippingAddressId;
    if (typeof rawAddressId !== "string" || !rawAddressId) {
      return NextResponse.json(
        { success: false, error: "Shipping address is required" },
        { status: 400 }
      );
    }
    const address = await db.address.findFirst({
      where: { id: rawAddressId, userId },
    });
    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address not found" },
        { status: 404 }
      );
    }
    shippingAddressId = address.id;

    const cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                priceInCents: true,
                stock: true,
                images: { select: { url: true }, take: 1 },
              },
            },
            variant: {
              select: { name: true, priceInCents: true, stock: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cart is empty" },
        { status: 400 }
      );
    }

    for (const item of cart.items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { isActive: true, name: true, stock: true },
      });
      if (!product || !product.isActive) {
        return NextResponse.json(
          {
            success: false,
            error: `"${product?.name ?? "Unknown product"}" is no longer available`,
          },
          { status: 400 }
        );
      }
      if (item.variantId) {
        const variant = await db.productVariant.findUnique({
          where: { id: item.variantId },
          select: { isActive: true, name: true, stock: true },
        });
        if (!variant || !variant.isActive) {
          return NextResponse.json(
            {
              success: false,
              error: `Variant "${variant?.name ?? "unknown"}" is no longer available`,
            },
            { status: 400 }
          );
        }
        if (variant.stock < item.quantity) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient stock for "${product.name} (${variant.name})"`,
            },
            { status: 400 }
          );
        }
      } else if (product.stock < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for "${product.name}"` },
          { status: 400 }
        );
      }
    }

    for (const item of cart.items) {
      const unitAmount = item.variant?.priceInCents ?? item.product.priceInCents;
      const productName = item.variant
        ? `${item.product.name} (${item.variant.name})`
        : item.product.name;
      subtotalInCents += unitAmount * item.quantity;
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: productName,
            images: item.product.images[0]?.url
              ? [absoluteUrl(item.product.images[0].url)]
              : [],
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      });
    }

    customerEmail = session?.user?.email ?? undefined;
  }

  // Validate and apply promo code. This silently drops invalid codes —
  // the UI is expected to have called POST /api/promos/validate first,
  // which surfaces the specific error message. Here we re-check the
  // rules as a defense-in-depth measure before creating the Stripe
  // session. For guests the "already used" check keys off guestEmail.
  let discountAmount = 0;
  let validatedPromoId: string | null = null;
  let validatedPromo: Awaited<ReturnType<typeof db.promoCode.findUnique>> =
    null;
  if (promoCode) {
    const promo = await db.promoCode.findUnique({
      where: { code: promoCode.toUpperCase() },
    });

    if (promo) {
      const alreadyUsed = !!(await db.promoUsage.findFirst({
        where: userId
          ? { promoId: promo.id, userId }
          : { promoId: promo.id, guestEmail: guestEmailForOrder! },
      }));
      const check = checkPromoApplicability({
        promo,
        now: new Date(),
        subtotalInCents: subtotalInCents,
        alreadyUsedByUser: alreadyUsed,
      });
      if (check.applicable) {
        validatedPromoId = promo.id;
        validatedPromo = promo;
        discountAmount = check.discountInCents;
      }
    }
  }

  const subtotalAfterDiscount = Math.max(0, subtotalInCents - discountAmount);
  const shippingCost = subtotalAfterDiscount >= 10000 ? 0 : 599;

  // Get (or lazily create) the Stripe coupon for this promo. Caching the
  // ID on the PromoCode row means we only hit stripe.coupons.create once
  // per promo instead of once per checkout.
  //
  // Important subtlety for PERCENTAGE promos: the discount AMOUNT can vary
  // per checkout (it's a share of the subtotal), so caching a fixed
  // `amount_off` coupon would be wrong. We create the coupon with
  // `percent_off` for percentage promos — that one IS stable and safe to
  // cache. FIXED_AMOUNT promos yield a stable `amount_off` and are also
  // safe to cache.
  let stripeCouponId: string | undefined;
  if (discountAmount > 0 && validatedPromo && validatedPromoId) {
    if (validatedPromo.stripeCouponId) {
      stripeCouponId = validatedPromo.stripeCouponId;
    } else {
      const coupon =
        validatedPromo.discountType === "PERCENTAGE"
          ? await stripe.coupons.create({
              percent_off: validatedPromo.discountValue,
              duration: "once",
              name: `Promo: ${promoCode!.toUpperCase()}`,
            })
          : await stripe.coupons.create({
              amount_off: validatedPromo.discountValue,
              currency: "eur",
              duration: "once",
              name: `Promo: ${promoCode!.toUpperCase()}`,
            });
      stripeCouponId = coupon.id;
      db.promoCode
        .update({
          where: { id: validatedPromoId },
          data: { stripeCouponId: coupon.id },
        })
        .catch((err) => {
          console.error(
            "[stripe checkout] failed to cache stripeCouponId:",
            err instanceof Error ? err.message : err
          );
        });
    }
  }

  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        product_data: {
          name: "Shipping",
          images: [],
        },
        unit_amount: shippingCost,
      },
      quantity: 1,
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    ...(stripeCouponId && {
      discounts: [{ coupon: stripeCouponId }],
    }),
    automatic_tax: { enabled: false },
    // Metadata is the only channel for passing our application-level
    // state through Stripe → webhook → verify-session. For guests
    // we include guestEmail/guestName so the downstream handlers
    // can create the order without needing our own session cookie.
    metadata: {
      shippingAddressId,
      ...(userId ? { userId } : {}),
      ...(isGuest && guestEmailForOrder
        ? {
            guestEmail: guestEmailForOrder,
            guestName: guestNameForOrder ?? "",
            // Compact item list so the webhook can rebuild the
            // order without access to a server-side cart.
            ...(guestItemsMeta ? { guestItems: guestItemsMeta } : {}),
          }
        : {}),
      ...(validatedPromoId && promoCode
        ? {
            promoId: validatedPromoId,
            promoCode: promoCode.toUpperCase(),
            discountAmount: discountAmount.toString(),
          }
        : {}),
    },
    customer_email: customerEmail,
    success_url: absoluteUrl(
      "/checkout/success?session_id={CHECKOUT_SESSION_ID}"
    ),
    cancel_url: absoluteUrl("/cart"),
  });

  return NextResponse.json({
    success: true,
    data: { url: checkoutSession.url },
  });
}
