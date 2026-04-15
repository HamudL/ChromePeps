import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/utils";

// POST /api/stripe/checkout — create Stripe Checkout Session
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const limit = await rateLimit(`stripe:${session.user.id}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const body = await req.json();
  const { shippingAddressId, promoCode } = body;

  if (!shippingAddressId) {
    return NextResponse.json(
      { success: false, error: "Shipping address is required" },
      { status: 400 }
    );
  }

  // Validate address belongs to the authenticated user
  const address = await db.address.findFirst({
    where: { id: shippingAddressId, userId: session.user.id },
  });
  if (!address) {
    return NextResponse.json(
      { success: false, error: "Address not found" },
      { status: 404 }
    );
  }

  // Get cart
  const cart = await db.cart.findUnique({
    where: { userId: session.user.id },
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

  // Validate stock and availability before creating Stripe session
  for (const item of cart.items) {
    const product = await db.product.findUnique({
      where: { id: item.productId },
      select: { isActive: true, name: true, stock: true },
    });
    if (!product || !product.isActive) {
      return NextResponse.json(
        { success: false, error: `"${product?.name ?? "Unknown product"}" is no longer available` },
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
          { success: false, error: `Variant "${variant?.name ?? "unknown"}" is no longer available` },
          { status: 400 }
        );
      }
      if (variant.stock < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for "${product.name} (${variant.name})"` },
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

  // Build Stripe line items
  const lineItems = cart.items.map((item) => {
    const unitAmount = item.variant?.priceInCents ?? item.product.priceInCents;
    const productName = item.variant
      ? `${item.product.name} (${item.variant.name})`
      : item.product.name;

    return {
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
    };
  });

  // Calculate shipping
  const subtotal = cart.items.reduce((sum, item) => {
    const price = item.variant?.priceInCents ?? item.product.priceInCents;
    return sum + price * item.quantity;
  }, 0);

  // Validate and apply promo code
  let discountAmount = 0;
  let validatedPromoId: string | null = null;
  // Matching db row kept around so we can cache the Stripe coupon ID on it.
  let validatedPromo: Awaited<ReturnType<typeof db.promoCode.findUnique>> =
    null;
  if (promoCode) {
    const promo = await db.promoCode.findUnique({
      where: { code: promoCode.toUpperCase() },
    });

    if (promo && promo.isActive) {
      const now = new Date();
      const notExpired = !promo.expiresAt || promo.expiresAt > now;
      const notEarly = !promo.startsAt || promo.startsAt <= now;
      const notMaxed = !promo.maxUses || promo.usedCount < promo.maxUses;
      const meetsMin = !promo.minOrderCents || subtotal >= promo.minOrderCents;

      // Check user hasn't used it
      const alreadyUsed = await db.promoUsage.findFirst({
        where: { promoId: promo.id, userId: session.user.id },
      });

      if (notExpired && notEarly && notMaxed && meetsMin && !alreadyUsed) {
        validatedPromoId = promo.id;
        validatedPromo = promo;
        if (promo.discountType === "PERCENTAGE") {
          discountAmount = Math.round((subtotal * promo.discountValue) / 100);
        } else {
          discountAmount = Math.min(promo.discountValue, subtotal);
        }
      }
    }
  }

  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
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
              name: `Promo: ${promoCode.toUpperCase()}`,
            })
          : await stripe.coupons.create({
              amount_off: validatedPromo.discountValue,
              currency: "eur",
              duration: "once",
              name: `Promo: ${promoCode.toUpperCase()}`,
            });
      stripeCouponId = coupon.id;
      // Persist the ID for next time. Fire-and-forget — even if this
      // fails (e.g. concurrent writes), the worst case is we create the
      // same coupon twice, not a functional bug.
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
    metadata: {
      userId: session.user.id,
      shippingAddressId,
      ...(validatedPromoId && {
        promoId: validatedPromoId,
        promoCode: promoCode.toUpperCase(),
        discountAmount: discountAmount.toString(),
      }),
    },
    customer_email: session.user.email ?? undefined,
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
