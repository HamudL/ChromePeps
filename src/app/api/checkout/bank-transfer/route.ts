import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/order/generate-order-number";
import { calculateOrderTotals } from "@/lib/order/calculate-totals";
import { checkPromoApplicability } from "@/lib/order/promo-applicability";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { cacheDel } from "@/lib/redis";
import { CACHE_KEYS } from "@/lib/constants";
import { sendOrderConfirmationEmail } from "@/lib/mail/send";

/**
 * POST /api/checkout/bank-transfer
 *
 * Supports TWO shapes:
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
 * For guests we create a one-off Address row (userId=null) and build
 * the order items from DB lookups of the provided items (we never
 * trust client-supplied prices — everything resolves fresh against
 * the current Product/ProductVariant rows).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isGuest = !userId;

  const body = await req.json();
  const promoCode: string | null = body.promoCode ?? null;

  // Rate-limiting — per identity (tighter) + per IP (defense in
  // depth). For guests the "per identity" key is their email,
  // which an attacker can churn, but the per-IP layer catches
  // that pattern.
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0].trim() ?? "unknown";
  const ipLimit = await rateLimit(`bank-transfer:ip:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!ipLimit.success) return rateLimitExceeded(ipLimit);

  if (userId) {
    const userLimit = await rateLimit(`bank-transfer:${userId}`, {
      maxRequests: 5,
      windowMs: 60_000,
    });
    if (!userLimit.success) return rateLimitExceeded(userLimit);
  }

  // Resolve cart items + the shipping address differently for each
  // mode. Both code paths end with:
  //   - `orderItems` (the items that'll go on the order)
  //   - `subtotalInCents`
  //   - `shippingAddressId` pointing at an Address row we can use
  //   - `cartIdForClear` only for auth users (guests have no row)
  //   - `addressSnapshot` for the confirmation email
  let orderItems: Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    priceInCents: number;
  }>;
  let subtotalInCents = 0;
  let shippingAddressId: string;
  let cartIdForClear: string | null = null;
  let addressSnapshot: {
    firstName: string;
    lastName: string;
    company: string | null;
    street: string;
    street2: string | null;
    postalCode: string;
    city: string;
    country: string;
  };
  let recipientEmail: string;
  let recipientName: string | null;
  // Stock-decrement source — for each item we need product/variant
  // id + quantity. Same shape as what createOrderFromStripeSession
  // expects for its stock loop.
  const stockItems: Array<{
    productId: string;
    variantId: string | null;
    quantity: number;
  }> = [];

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

    // Look up every product + variant the guest claims to be
    // buying. We only trust server-side prices/stock — the client
    // supplies ids + quantities only.
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
            select: { id: true, name: true, sku: true, priceInCents: true },
          })
        : Promise.resolve([]),
      variantIds.length
        ? db.productVariant.findMany({
            where: { id: { in: variantIds }, isActive: true },
            select: { id: true, name: true, sku: true, priceInCents: true },
          })
        : Promise.resolve([]),
    ]);
    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    orderItems = [];
    for (const rawItem of guestItems) {
      const pid = typeof rawItem.productId === "string" ? rawItem.productId : "";
      const vid =
        typeof rawItem.variantId === "string" ? rawItem.variantId : null;
      const qty =
        typeof rawItem.quantity === "number" && rawItem.quantity > 0
          ? Math.floor(rawItem.quantity)
          : 0;
      if (!pid || qty <= 0) continue;
      const product = productMap.get(pid);
      if (!product) continue;
      const variant = vid ? variantMap.get(vid) ?? null : null;
      if (vid && !variant) continue;
      const price = variant?.priceInCents ?? product.priceInCents;
      const sku = variant?.sku ?? product.sku;
      subtotalInCents += price * qty;
      orderItems.push({
        productId: pid,
        variantId: vid,
        productName: product.name,
        variantName: variant?.name ?? null,
        sku,
        quantity: qty,
        priceInCents: price,
      });
      stockItems.push({ productId: pid, variantId: vid, quantity: qty });
    }

    if (orderItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Keines der Produkte im Warenkorb ist noch verfügbar.",
        },
        { status: 400 }
      );
    }

    // Create a one-off Address row for the guest (userId=null).
    // These rows are attached only to the order record and never
    // surface in any user's "saved addresses" list.
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
    addressSnapshot = {
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company,
      street: address.street,
      street2: address.street2,
      postalCode: address.postalCode,
      city: address.city,
      country: address.country,
    };
    recipientEmail = rawGuestEmail;
    recipientName = rawGuestName;
    cartIdForClear = null;
  } else {
    // Authenticated path — saved address + server-side cart.
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
    addressSnapshot = {
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company,
      street: address.street,
      street2: address.street2,
      postalCode: address.postalCode,
      city: address.city,
      country: address.country,
    };

    const cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, priceInCents: true, stock: true, sku: true },
            },
            variant: {
              select: { name: true, priceInCents: true, stock: true, sku: true },
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

    orderItems = [];
    for (const item of cart.items) {
      const price = item.variant?.priceInCents ?? item.product.priceInCents;
      const sku = item.variant?.sku ?? item.product.sku;
      subtotalInCents += price * item.quantity;
      orderItems.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        variantName: item.variant?.name ?? null,
        sku,
        quantity: item.quantity,
        priceInCents: price,
      });
      stockItems.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      });
    }

    cartIdForClear = cart.id;

    // Look up the user's actual email/name from the session's
    // user row. `session.user.email` from NextAuth v5 can be
    // null for credentials-only providers, so read from the DB
    // to be safe.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    recipientEmail = user?.email ?? session?.user?.email ?? "";
    recipientName = user?.name ?? session?.user?.name ?? null;
  }

  // Validate and apply promo code. Silently drops invalid codes — the
  // UI has already shown the specific failure message through
  // /api/promos/validate as a defense-in-depth second check here.
  let discountInCents = 0;
  let validatedPromoId: string | null = null;
  let promoCodeStr: string | null = null;

  if (promoCode) {
    const promo = await db.promoCode.findUnique({
      where: { code: promoCode.toUpperCase() },
    });

    if (promo) {
      const alreadyUsed = !!(await db.promoUsage.findFirst({
        where: userId
          ? { promoId: promo.id, userId }
          : { promoId: promo.id, guestEmail: recipientEmail },
      }));
      const check = checkPromoApplicability({
        promo,
        now: new Date(),
        subtotalInCents,
        alreadyUsedByUser: alreadyUsed,
      });
      if (check.applicable) {
        validatedPromoId = promo.id;
        promoCodeStr = promo.code;
        discountInCents = check.discountInCents;
      }
    }
  }

  const totals = calculateOrderTotals({ subtotalInCents, discountInCents });

  // Create order in a transaction — atomic across order + promo
  // usage + stock decrement + (for auth users) cart clear.
  const order = await db.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        guestEmail: userId ? null : recipientEmail,
        guestName: userId ? null : recipientName,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "BANK_TRANSFER",
        subtotalInCents: totals.subtotalInCents,
        discountInCents: totals.discountInCents,
        promoCode: promoCodeStr,
        taxInCents: totals.taxInCents,
        shippingInCents: totals.shippingInCents,
        totalInCents: totals.totalInCents,
        shippingAddressId,
        billingAddressId: shippingAddressId,
        items: { createMany: { data: orderItems } },
        events: {
          create: {
            status: "PENDING",
            note: "Order placed — awaiting bank transfer payment",
          },
        },
      },
    });

    // Record promo usage — keyed by userId for auth, by guestEmail
    // for guests. Either way the "one redemption per buyer" check
    // can look it up next time.
    if (validatedPromoId) {
      await tx.promoUsage.create({
        data: {
          promoId: validatedPromoId,
          userId,
          guestEmail: userId ? null : recipientEmail,
          orderId: newOrder.id,
          discountAmount: totals.discountInCents,
        },
      });
      await tx.promoCode.update({
        where: { id: validatedPromoId },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Decrement stock (with validation to prevent negative stock).
    for (const item of stockItems) {
      if (item.variantId) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(`Insufficient stock for variant ${item.variantId}`);
        }
      } else {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }
      }
    }

    // Clear auth users' server-side cart. Guests have nothing to
    // clear server-side — their Zustand cart will reset on the
    // client after the success-page redirect.
    if (cartIdForClear) {
      await tx.cartItem.deleteMany({ where: { cartId: cartIdForClear } });
    }

    return newOrder;
  });

  if (userId) {
    await cacheDel(CACHE_KEYS.CART(userId));
  }

  // Send order confirmation email with bank details. Never block on mail
  // failures — the order is already committed. Log and move on if
  // anything goes wrong. For guests we include an order-status URL so
  // they have a way back into the order info without a login.
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const orderUrl = baseUrl
      ? userId
        ? `${baseUrl}/dashboard/orders/${order.id}`
        : `${baseUrl}/order-status?orderNumber=${encodeURIComponent(
            order.orderNumber
          )}&email=${encodeURIComponent(recipientEmail)}`
      : undefined;
    await sendOrderConfirmationEmail({
      to: recipientEmail,
      customerName: recipientName,
      orderNumber: order.orderNumber,
      orderUrl,
      placedAt: order.createdAt,
      items: orderItems.map((item) => ({
        name: item.productName,
        variant: item.variantName,
        sku: item.sku,
        quantity: item.quantity,
        priceInCents: item.priceInCents,
        productId: item.productId,
      })),
      subtotalInCents: totals.subtotalInCents,
      shippingInCents: totals.shippingInCents,
      taxInCents: totals.taxInCents,
      discountInCents: totals.discountInCents,
      totalInCents: totals.totalInCents,
      paymentMethod: "BANK_TRANSFER",
      shippingAddress: addressSnapshot,
    });
  } catch (err) {
    console.error(
      "[bank-transfer] order confirmation email failed:",
      err instanceof Error ? err.message : err
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalInCents: order.totalInCents,
    },
  });
}
