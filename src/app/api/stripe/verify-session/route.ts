import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/utils";
import { cacheDel } from "@/lib/redis";
import { CACHE_KEYS } from "@/lib/constants";
import { sendOrderConfirmationEmail } from "@/lib/mail/send";

/**
 * POST /api/stripe/verify-session
 *
 * Fallback for when the Stripe webhook doesn't fire (misconfigured secret,
 * network issues, etc.). Called from the checkout success page.
 *
 * Retrieves the Stripe Checkout Session, checks payment status, and creates
 * the order if it doesn't already exist.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { sessionId } = await req.json();
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing sessionId" },
      { status: 400 }
    );
  }

  // Check if an order already exists for this session (webhook may have handled it)
  const existingOrder = await db.order.findUnique({
    where: { stripeSessionId: sessionId },
    select: { id: true, orderNumber: true },
  });

  if (existingOrder) {
    return NextResponse.json({
      success: true,
      data: {
        orderId: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
        alreadyCreated: true,
      },
    });
  }

  // Retrieve the session from Stripe to verify payment
  let stripeSession;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid session" },
      { status: 400 }
    );
  }

  // Only create order if payment is confirmed
  if (stripeSession.payment_status !== "paid") {
    return NextResponse.json(
      { success: false, error: "Payment not completed" },
      { status: 400 }
    );
  }

  // Verify the session belongs to this user
  const userId = stripeSession.metadata?.userId;
  if (userId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: "Session mismatch" },
      { status: 403 }
    );
  }

  const shippingAddressId = stripeSession.metadata?.shippingAddressId;

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
    // Cart already cleared (possibly by webhook that partially ran).
    // Check if order was created between our first check and now (race).
    const raceCheck = await db.order.findUnique({
      where: { stripeSessionId: sessionId },
      select: { id: true, orderNumber: true },
    });
    if (raceCheck) {
      return NextResponse.json({
        success: true,
        data: {
          orderId: raceCheck.id,
          orderNumber: raceCheck.orderNumber,
          alreadyCreated: true,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Cart is empty — order may have already been processed" },
      { status: 400 }
    );
  }

  // Build order items from cart
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

  // Promo data from Stripe metadata
  const promoId = stripeSession.metadata?.promoId ?? null;
  const promoCodeStr = stripeSession.metadata?.promoCode ?? null;
  const discountInCents =
    parseInt(stripeSession.metadata?.discountAmount ?? "0") || 0;

  const subtotalAfterDiscount = Math.max(0, subtotalInCents - discountInCents);
  const shippingInCents = subtotalAfterDiscount >= 10000 ? 0 : 599;
  const totalInCents = subtotalAfterDiscount + shippingInCents;
  const taxInCents = Math.round(totalInCents - totalInCents / 1.19);

  try {
    const txResult = await db.$transaction(async (tx) => {
      // Double-check inside transaction to prevent duplicates
      const doubleCheck = await tx.order.findUnique({
        where: { stripeSessionId: sessionId },
      });
      if (doubleCheck) return { order: doubleCheck, wasCreated: false };

      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          status: "PROCESSING",
          paymentStatus: "SUCCEEDED",
          stripeSessionId: sessionId,
          stripePaymentIntentId:
            typeof stripeSession.payment_intent === "string"
              ? stripeSession.payment_intent
              : stripeSession.payment_intent?.id ?? null,
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

      // Record promo usage
      if (promoId) {
        await tx.promoUsage.create({
          data: {
            promoId,
            userId,
            orderId: created.id,
            discountAmount: discountInCents,
          },
        });
        await tx.promoCode.update({
          where: { id: promoId },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Decrement stock
      for (const item of cart.items) {
        if (item.variantId) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
        } else {
          await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return { order: created, wasCreated: true };
    });

    await cacheDel(CACHE_KEYS.CART(userId));

    // Send confirmation email only when this path actually created the order,
    // so we don't duplicate when webhook + verify-session race.
    if (txResult.wasCreated) {
      try {
        const [user, fullOrder] = await Promise.all([
          db.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
          }),
          db.order.findUnique({
            where: { id: txResult.order.id },
            include: { items: true, shippingAddress: true },
          }),
        ]);

        if (user?.email && fullOrder) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
          await sendOrderConfirmationEmail({
            to: user.email,
            customerName: user.name,
            orderNumber: fullOrder.orderNumber,
            orderUrl: baseUrl
              ? `${baseUrl}/dashboard/orders/${fullOrder.id}`
              : undefined,
            placedAt: fullOrder.createdAt,
            items: fullOrder.items.map((item) => ({
              name: item.productName,
              variant: item.variantName,
              sku: item.sku,
              quantity: item.quantity,
              priceInCents: item.priceInCents,
              productId: item.productId,
            })),
            subtotalInCents: fullOrder.subtotalInCents,
            shippingInCents: fullOrder.shippingInCents,
            taxInCents: fullOrder.taxInCents,
            discountInCents: fullOrder.discountInCents,
            totalInCents: fullOrder.totalInCents,
            paymentMethod: "STRIPE",
            shippingAddress: fullOrder.shippingAddress
              ? {
                  firstName: fullOrder.shippingAddress.firstName,
                  lastName: fullOrder.shippingAddress.lastName,
                  company: fullOrder.shippingAddress.company,
                  street: fullOrder.shippingAddress.street,
                  street2: fullOrder.shippingAddress.street2,
                  postalCode: fullOrder.shippingAddress.postalCode,
                  city: fullOrder.shippingAddress.city,
                  country: fullOrder.shippingAddress.country,
                }
              : null,
          });
        }
      } catch (err) {
        console.error(
          "[verify-session] order confirmation email failed:",
          err instanceof Error ? err.message : err
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: txResult.order.id,
        orderNumber: txResult.order.orderNumber,
        alreadyCreated: !txResult.wasCreated,
      },
    });
  } catch (err) {
    // If unique constraint error, order was created by webhook in the meantime
    const isPrismaUniqueError =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (isPrismaUniqueError) {
      const created = await db.order.findUnique({
        where: { stripeSessionId: sessionId },
        select: { id: true, orderNumber: true },
      });
      if (created) {
        return NextResponse.json({
          success: true,
          data: {
            orderId: created.id,
            orderNumber: created.orderNumber,
            alreadyCreated: true,
          },
        });
      }
    }
    throw err;
  }
}
