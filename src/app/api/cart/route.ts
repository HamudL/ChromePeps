import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import {
  addToCartSchema,
  updateCartItemSchema,
  syncCartSchema,
} from "@/validators/cart";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/constants";

// GET /api/cart — get user's server-side cart
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const cacheKey = CACHE_KEYS.CART(userId);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, data: cached });
  }

  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              priceInCents: true,
              stock: true,
              isActive: true,
              images: { select: { url: true }, take: 1 },
            },
          },
          variant: {
            select: {
              name: true,
              priceInCents: true,
              stock: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  const data = cart ?? { items: [] };
  await cacheSet(cacheKey, data, CACHE_TTL.CART);

  return NextResponse.json({ success: true, data });
}

// POST /api/cart — add item to cart
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const limit = await rateLimit(`cart:${session.user.id}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const body = await req.json();
  const parsed = addToCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { productId, variantId, quantity } = parsed.data;

  // Validate product exists and is in stock
  const product = await db.product.findUnique({
    where: { id: productId, isActive: true },
  });
  if (!product) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  if (variantId) {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId, isActive: true },
    });
    if (!variant) {
      return NextResponse.json(
        { success: false, error: "Variant not found" },
        { status: 404 }
      );
    }
    if (variant.stock < quantity) {
      return NextResponse.json(
        { success: false, error: "Insufficient stock" },
        { status: 400 }
      );
    }
  } else if (product.stock < quantity) {
    return NextResponse.json(
      { success: false, error: "Insufficient stock" },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // Upsert cart
  const cart = await db.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  // Upsert cart item — use findFirst for null variantId since
  // PostgreSQL unique constraints don't enforce uniqueness on NULLs
  const existingItem = variantId
    ? await db.cartItem.findUnique({
        where: {
          cartId_productId_variantId: {
            cartId: cart.id,
            productId,
            variantId,
          },
        },
      })
    : await db.cartItem.findFirst({
        where: { cartId: cart.id, productId, variantId: null },
      });

  if (existingItem) {
    await db.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: Math.min(existingItem.quantity + quantity, 99) },
    });
  } else {
    await db.cartItem.create({
      data: { cartId: cart.id, productId, variantId, quantity },
    });
  }

  await cacheDel(CACHE_KEYS.CART(userId));

  return NextResponse.json({ success: true }, { status: 201 });
}

// PATCH /api/cart — update item quantity
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = updateCartItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { itemId, quantity } = parsed.data;

  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });

  if (!item || item.cart.userId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: "Cart item not found" },
      { status: 404 }
    );
  }

  if (quantity === 0) {
    await db.cartItem.delete({ where: { id: itemId } });
  } else {
    await db.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  await cacheDel(CACHE_KEYS.CART(session.user.id));

  return NextResponse.json({ success: true });
}

// PUT /api/cart — sync client cart to server (full replace)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = syncCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // Upsert cart
  const cart = await db.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  // Clear existing items and replace with client cart (full sync)
  await db.cartItem.deleteMany({ where: { cartId: cart.id } });

  for (const item of parsed.data.items) {
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: Math.min(item.quantity, 99),
      },
    });
  }

  await cacheDel(CACHE_KEYS.CART(userId));

  return NextResponse.json({ success: true });
}
