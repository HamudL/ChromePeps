import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { createOrderSchema } from "@/validators/order";
import { generateOrderNumber } from "@/lib/utils";
import { cacheDel } from "@/lib/redis";
import { CACHE_KEYS } from "@/lib/constants";

// GET /api/orders — user's orders (paginated)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  const isAdmin = session.user.role === "ADMIN";
  const where = isAdmin ? {} : { userId: session.user.id };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalInCents: true,
        currency: true,
        createdAt: true,
        items: {
          select: { id: true, productName: true, quantity: true },
        },
      },
    }),
    db.order.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      items: orders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

// POST /api/orders — create order from cart (called after Stripe payment)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const limit = await rateLimit(`orders:${session.user.id}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // Get cart with items
  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
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

  // Validate stock and calculate totals
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
    const stock = item.variant?.stock ?? item.product.stock;
    const sku = item.variant?.sku ?? item.product.sku;

    if (stock < item.quantity) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient stock for ${item.product.name}`,
        },
        { status: 400 }
      );
    }

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

  const taxInCents = Math.round(subtotalInCents * 0.19); // 19% DE VAT
  const shippingInCents = subtotalInCents >= 10000 ? 0 : 599; // Free shipping over 100 EUR
  const totalInCents = subtotalInCents + taxInCents + shippingInCents;

  // Create order in a transaction
  const order = await db.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        subtotalInCents,
        taxInCents,
        shippingInCents,
        totalInCents,
        shippingAddressId: parsed.data.shippingAddressId,
        billingAddressId: parsed.data.billingAddressId ?? parsed.data.shippingAddressId,
        notes: parsed.data.notes,
        items: { createMany: { data: orderItems } },
        events: {
          create: { status: "PENDING", note: "Order created" },
        },
      },
      include: { items: true },
    });

    // Decrement stock
    for (const item of cart.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  await cacheDel(CACHE_KEYS.CART(userId));

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}
