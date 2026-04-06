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
  const { shippingAddressId } = body;

  if (!shippingAddressId) {
    return NextResponse.json(
      { success: false, error: "Shipping address is required" },
      { status: 400 }
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
            ? [item.product.images[0].url]
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

  const shippingCost = subtotal >= 10000 ? 0 : 599;

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
    automatic_tax: { enabled: false },
    metadata: {
      userId: session.user.id,
      shippingAddressId,
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
