import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { generateOrderNumber } from "@/lib/order/generate-order-number";
import { calculateOrderTotals } from "@/lib/order/calculate-totals";

/**
 * Shared order-creation logic used by both the Stripe webhook handler and
 * the /api/stripe/verify-session fallback. Extracted to avoid drift between
 * the two entry points — before this, the same order-creation transaction
 * was inlined twice and had already diverged (e.g. the webhook validated
 * stock decrement underflow, verify-session did not).
 *
 * The caller is responsible for:
 *   - authenticating the user
 *   - verifying the Stripe session (signature in webhook, payment_status
 *     check in verify-session)
 *   - fetching the user's cart with items + product + variant relations
 *   - checking whether an order already exists for this stripe session id
 *   - opening a Prisma transaction
 *   - sending the order confirmation email after this helper returns
 *
 * This function throws if any product or variant has insufficient stock —
 * callers should be prepared to catch and handle that (the webhook lets
 * the error bubble so Stripe retries; verify-session reports it to the
 * user and relies on out-of-band refund handling).
 */

type CartWithItems = {
  id: string;
  items: Array<{
    productId: string;
    variantId: string | null;
    quantity: number;
    product: {
      name: string;
      sku: string;
      priceInCents: number;
    };
    variant:
      | {
          name: string;
          sku: string;
          priceInCents: number;
        }
      | null;
  }>;
};

export type CreateOrderFromStripeArgs = {
  tx: Prisma.TransactionClient;
  userId: string;
  stripeSession: Stripe.Checkout.Session;
  cart: CartWithItems;
  shippingAddressId: string | null;
};

export async function createOrderFromStripeSession(
  args: CreateOrderFromStripeArgs
) {
  const { tx, userId, stripeSession, cart, shippingAddressId } = args;

  // Build order items + subtotal from the cart.
  let subtotalInCents = 0;
  const orderItems = cart.items.map((item) => {
    const price = item.variant?.priceInCents ?? item.product.priceInCents;
    const sku = item.variant?.sku ?? item.product.sku;
    subtotalInCents += price * item.quantity;
    return {
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name,
      variantName: item.variant?.name ?? null,
      sku,
      quantity: item.quantity,
      priceInCents: price,
    };
  });

  // Promo data flows in through the Stripe session metadata set during
  // checkout creation.
  const promoId = stripeSession.metadata?.promoId ?? null;
  const promoCodeStr = stripeSession.metadata?.promoCode ?? null;
  const rawDiscount =
    parseInt(stripeSession.metadata?.discountAmount ?? "0") || 0;

  // Delegate the math to the shared pure helper so Stripe, bank-transfer,
  // and the verify-session fallback all produce byte-identical totals.
  const totals = calculateOrderTotals({
    subtotalInCents,
    discountInCents: rawDiscount,
  });

  const order = await tx.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId,
      status: "PROCESSING",
      paymentStatus: "SUCCEEDED",
      stripeSessionId: stripeSession.id,
      stripePaymentIntentId:
        typeof stripeSession.payment_intent === "string"
          ? stripeSession.payment_intent
          : stripeSession.payment_intent?.id ?? null,
      subtotalInCents: totals.subtotalInCents,
      discountInCents: totals.discountInCents,
      promoCode: promoCodeStr,
      taxInCents: totals.taxInCents,
      shippingInCents: totals.shippingInCents,
      totalInCents: totals.totalInCents,
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

  // Record promo usage and bump the global counter. This keeps the
  // per-code quota honest across concurrent checkouts because the
  // increment runs inside the same transaction as the order creation.
  if (promoId) {
    await tx.promoUsage.create({
      data: {
        promoId,
        userId,
        orderId: order.id,
        discountAmount: totals.discountInCents,
      },
    });
    await tx.promoCode.update({
      where: { id: promoId },
      data: { usedCount: { increment: 1 } },
    });
  }

  // Decrement stock atomically, rejecting underflow. Using updateMany with
  // a `stock >= qty` guard in the WHERE clause is the Prisma-friendly way
  // to express "CAS update" — if the row doesn't match, updated.count is
  // zero and we throw, aborting the whole transaction.
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

  // Clear the user's cart inside the transaction so a crash between order
  // creation and cart clear doesn't leave stale items behind.
  await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

  return order;
}
