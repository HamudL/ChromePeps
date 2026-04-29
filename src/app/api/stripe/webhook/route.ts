import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { cacheDel } from "@/lib/redis";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { CACHE_KEYS } from "@/lib/constants";
import { sendOrderConfirmationEmail } from "@/lib/mail/send";
import { createOrderFromStripeSession } from "@/lib/order/create-from-stripe";
import { resolveCartFromStripeSession } from "@/lib/order/resolve-cart-from-stripe";
import type Stripe from "stripe";

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Belt-and-suspenders rate limit by client IP. Stripe signature
  // verification is the primary defense, but an attacker with leaked
  // webhook secret could still flood this endpoint until the secret is
  // rotated. The limit is generous (60/min) so Stripe's own retries are
  // never rejected.
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0].trim() ?? "unknown";
  const limit = await rateLimit(`stripe-webhook:${ip}`, {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

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
  const userId = session.metadata?.userId ?? null;
  const guestEmail = session.metadata?.guestEmail ?? null;
  const guestName = session.metadata?.guestName ?? null;
  const shippingAddressId = session.metadata?.shippingAddressId ?? null;

  if (!userId && !guestEmail) {
    console.error(
      "[Stripe Webhook] Session has neither userId nor guestEmail in metadata"
    );
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

  // Resolve the cart. For auth users this reads their server-side
  // Cart row; for guests it parses the compact item list from the
  // session metadata that /api/stripe/checkout stamped there.
  const cart = await resolveCartFromStripeSession(session);
  if (!cart) {
    // Re-check if the verify-session fallback beat us to creating
    // the order in the brief window since our first look-up.
    const raceCheck = await db.order.findUnique({
      where: { stripeSessionId: session.id },
      select: { id: true },
    });
    if (raceCheck) {
      console.log(
        "[Stripe Webhook] Order created by fallback for session:",
        session.id
      );
      return;
    }
    console.error(
      "[Stripe Webhook] CRITICAL: Cannot resolve cart for session:",
      session.id,
      "(userId:",
      userId,
      "guestEmail:",
      guestEmail,
      ")"
    );
    throw new Error(
      `Cart unresolvable after payment for session ${session.id}. Payment collected but no order created.`
    );
  }

  // Delegate the actual order transaction to the shared helper so this
  // path and /api/stripe/verify-session stay in sync.
  const createdOrderId = await db.$transaction(async (tx) => {
    const order = await createOrderFromStripeSession({
      tx,
      userId,
      guestEmail: userId ? null : guestEmail,
      guestName: userId ? null : guestName,
      stripeSession: session,
      cart,
      shippingAddressId,
    });
    return order.id;
  });

  if (userId) {
    await cacheDel(CACHE_KEYS.CART(userId));
  }

  // Fire-and-forget: Mail-Send blockt den Webhook NICHT. Stripe hat ein
  // 30-s-Timeout; bei großen COA-Anhängen (PDFs vom Filesystem) + Resend-
  // API-Latenz konnte das knapp werden — bei Timeout retried Stripe den
  // Webhook, aber unsere DB-Side-Effects sind schon committed → potenziell
  // doppelte Confirmation-Mails. Mit dem Background-Run kehrt der Webhook
  // sofort nach Order-Create zurück (≤300 ms), die Mail wird im selben
  // Container-Prozess danach versendet. sendOrderConfirmationEmail ist
  // bereits "graceful failure" (loggt + returnt result, throw't nicht);
  // .catch() fängt rare unhandled-rejections ab.
  void sendStripeOrderConfirmationInBackground({
    createdOrderId,
    userId,
    guestEmail,
    guestName,
  }).catch((err) => {
    console.error(
      "[Stripe Webhook] background mail failed:",
      err instanceof Error ? err.message : err
    );
  });
}

interface StripeMailContext {
  createdOrderId: string;
  userId: string | null;
  guestEmail: string | null;
  guestName: string | null;
}

async function sendStripeOrderConfirmationInBackground(
  ctx: StripeMailContext
): Promise<void> {
  const { createdOrderId, userId, guestEmail, guestName } = ctx;
  const fullOrder = await db.order.findUnique({
    where: { id: createdOrderId },
    include: { items: true, shippingAddress: true },
  });
  if (!fullOrder) return;

  let recipientEmail: string | null = null;
  let recipientName: string | null = null;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    recipientEmail = user?.email ?? null;
    recipientName = user?.name ?? null;
  } else {
    recipientEmail = guestEmail;
    recipientName = guestName;
  }

  if (!recipientEmail) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const orderUrl = baseUrl
    ? userId
      ? `${baseUrl}/dashboard/orders/${fullOrder.id}`
      : `${baseUrl}/order-status?orderNumber=${encodeURIComponent(
          fullOrder.orderNumber
        )}&email=${encodeURIComponent(recipientEmail)}`
    : undefined;

  await sendOrderConfirmationEmail({
    to: recipientEmail,
    customerName: recipientName,
    orderNumber: fullOrder.orderNumber,
    orderUrl,
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

      // Restore stock (skip if product/variant has been hard-deleted)
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant
            .update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            })
            .catch(() => {});
        } else if (item.productId) {
          await tx.product
            .update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
            .catch(() => {});
        }
      }
    });
  }
}
