import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/utils";
import { cacheDel } from "@/lib/redis";
import { CACHE_KEYS } from "@/lib/constants";
import type Stripe from "stripe";

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { success: false, error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { success: false, error: "Webhook not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", message);
    return NextResponse.json(
      { success: false, error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Idempotency: claim this event atomically before processing.
  // If another request already claimed it, the unique constraint will reject us.
  try {
    await db.stripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
        payloadSnapshot: JSON.parse(body),
      },
    });
  } catch (err: unknown) {
    // Unique constraint violation = already processing/processed
    const isPrismaUniqueError =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (isPrismaUniqueError) {
      return NextResponse.json({ success: true, message: "Already processed" });
    }
    throw err;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "charge.refunded":
        await handleRefund(event.data.object as Stripe.Charge);
        break;
    }
  } catch (err) {
    console.error(
      `[Stripe Webhook] Error processing ${event.type}:`,
      err instanceof Error ? err.message : err
    );
    // Delete the event record so Stripe can retry
    await db.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    return NextResponse.json(
      { success: false, error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const shippingAddressId = session.metadata?.shippingAddressId;

  if (!userId) {
    console.error("[Stripe Webhook] No userId in session metadata");
    return;
  }

  // Check if verify-session fallback already created this order
  const existingOrder = await db.order.findUnique({
    where: { stripeSessionId: session.id },
    select: { id: true },
  });
  if (existingOrder) {
    console.log("[Stripe Webhook] Order already exists for session:", session.id);
    return;
  }

  // Get user's cart
  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: true, variant: true },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    // Re-check if order was created between our first check and now
    const raceCheck = await db.order.findUnique({
      where: { stripeSessionId: session.id },
      select: { id: true },
    });
    if (raceCheck) {
      console.log("[Stripe Webhook] Order created by fallback for session:", session.id);
      return;
    }
    console.error(
      "[Stripe Webhook] CRITICAL: Cart empty for user after payment:",
      userId,
      "Session:",
      session.id
    );
    throw new Error(
      `Cart empty for user ${userId} after payment (session: ${session.id}). Payment collected but no order created.`
    );
  }

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

  // Promo code data from metadata
  const promoId = session.metadata?.promoId ?? null;
  const promoCodeStr = session.metadata?.promoCode ?? null;
  const discountInCents = parseInt(session.metadata?.discountAmount ?? "0") || 0;

  const subtotalAfterDiscount = Math.max(0, subtotalInCents - discountInCents);
  const shippingInCents = subtotalAfterDiscount >= 10000 ? 0 : 599;
  const taxInCents = Math.round((subtotalAfterDiscount + shippingInCents) * 0.19);
  const totalInCents = subtotalAfterDiscount + shippingInCents + taxInCents;

  await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        status: "PROCESSING",
        paymentStatus: "SUCCEEDED",
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        subtotalInCents,
        discountInCents,
        promoCode: promoCodeStr,
        taxInCents,
        shippingInCents,
        totalInCents,
        shippingAddressId: shippingAddressId ?? null,
        billingAddressId: shippingAddressId ?? null,
        items: { createMany: { data: orderItems } },
        events: {
          create: {
            status: "PROCESSING",
            note: promoCodeStr
              ? `Payment confirmed via Stripe (Promo: ${promoCodeStr})`
              : "Payment confirmed via Stripe",
          },
        },
      },
    });

    // Record promo usage and increment counter
    if (promoId) {
      await tx.promoUsage.create({
        data: {
          promoId,
          userId,
          orderId: order.id,
          discountAmount: discountInCents,
        },
      });
      await tx.promoCode.update({
        where: { id: promoId },
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
  });

  await cacheDel(CACHE_KEYS.CART(userId));
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const order = await db.order.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (order) {
    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });

    await db.orderEvent.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: `Payment failed: ${paymentIntent.last_payment_error?.message ?? "Unknown error"}`,
      },
    });
  }
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  const order = await db.order.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { items: true },
  });

  if (order) {
    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: "REFUNDED",
          note: "Refund processed via Stripe",
        },
      });

      // Restore stock
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    });
  }
}
