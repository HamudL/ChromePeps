import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/utils";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { cacheDel } from "@/lib/redis";
import { CACHE_KEYS } from "@/lib/constants";
import { sendOrderConfirmationEmail } from "@/lib/mail/send";

// POST /api/checkout/bank-transfer — create order with bank transfer payment
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const limit = await rateLimit(`bank-transfer:${session.user.id}`, {
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

  // Validate address
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
          product: { select: { name: true, priceInCents: true, stock: true, sku: true } },
          variant: { select: { name: true, priceInCents: true, stock: true, sku: true } },
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

  // Build order items and calculate subtotal
  let subtotalInCents = 0;
  const orderItems: Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    priceInCents: number;
  }> = [];

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
  }

  // Validate and apply promo code
  let discountInCents = 0;
  let validatedPromoId: string | null = null;
  let promoCodeStr: string | null = null;

  if (promoCode) {
    const promo = await db.promoCode.findUnique({
      where: { code: promoCode.toUpperCase() },
    });

    if (promo && promo.isActive) {
      const now = new Date();
      const notExpired = !promo.expiresAt || promo.expiresAt > now;
      const notEarly = !promo.startsAt || promo.startsAt <= now;
      const notMaxed = !promo.maxUses || promo.usedCount < promo.maxUses;
      const meetsMin =
        !promo.minOrderCents || subtotalInCents >= promo.minOrderCents;

      const alreadyUsed = await db.promoUsage.findFirst({
        where: { promoId: promo.id, userId: session.user.id },
      });

      if (notExpired && notEarly && notMaxed && meetsMin && !alreadyUsed) {
        validatedPromoId = promo.id;
        promoCodeStr = promo.code;
        if (promo.discountType === "PERCENTAGE") {
          discountInCents = Math.round(
            (subtotalInCents * promo.discountValue) / 100
          );
        } else {
          discountInCents = Math.min(promo.discountValue, subtotalInCents);
        }
      }
    }
  }

  const subtotalAfterDiscount = Math.max(0, subtotalInCents - discountInCents);
  const shippingInCents = subtotalAfterDiscount >= 10000 ? 0 : 599;
  const totalInCents = subtotalAfterDiscount + shippingInCents;
  const taxInCents = Math.round(totalInCents - totalInCents / 1.19);

  // Create order in a transaction
  const order = await db.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: session.user.id,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "BANK_TRANSFER",
        subtotalInCents,
        discountInCents,
        promoCode: promoCodeStr,
        taxInCents,
        shippingInCents,
        totalInCents,
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

    // Record promo usage
    if (validatedPromoId) {
      await tx.promoUsage.create({
        data: {
          promoId: validatedPromoId,
          userId: session.user.id,
          orderId: newOrder.id,
          discountAmount: discountInCents,
        },
      });
      await tx.promoCode.update({
        where: { id: validatedPromoId },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Decrement stock (with validation to prevent negative stock)
    for (const item of cart.items) {
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

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  await cacheDel(CACHE_KEYS.CART(session.user.id));

  // Send order confirmation email with bank details. Never block on mail
  // failures — the order is already committed. Log and move on if anything
  // goes wrong.
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await sendOrderConfirmationEmail({
      to: session.user.email ?? "",
      customerName: session.user.name,
      orderNumber: order.orderNumber,
      orderUrl: baseUrl
        ? `${baseUrl}/dashboard/orders/${order.id}`
        : undefined,
      placedAt: order.createdAt,
      items: orderItems.map((item) => ({
        name: item.productName,
        variant: item.variantName,
        sku: item.sku,
        quantity: item.quantity,
        priceInCents: item.priceInCents,
      })),
      subtotalInCents,
      shippingInCents,
      taxInCents,
      discountInCents,
      totalInCents,
      paymentMethod: "BANK_TRANSFER",
      shippingAddress: {
        firstName: address.firstName,
        lastName: address.lastName,
        company: address.company,
        street: address.street,
        street2: address.street2,
        postalCode: address.postalCode,
        city: address.city,
        country: address.country,
      },
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
