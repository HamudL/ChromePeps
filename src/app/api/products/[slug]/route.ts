import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from "@/lib/redis";
import { auth } from "@/lib/auth";
import { updateProductSchema } from "@/validators/product";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/constants";
import { slugify } from "@/lib/utils";

// GET /api/products/[slug] — public, cached
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const cacheKey = CACHE_KEYS.PRODUCT_DETAIL(slug);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, data: cached });
  }

  const product = await db.product.findUnique({
    where: { slug, isActive: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
      variants: { where: { isActive: true }, orderBy: { priceInCents: "asc" } },
      reviews: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!product) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  await cacheSet(cacheKey, product, CACHE_TTL.PRODUCT_DETAIL);

  return NextResponse.json({ success: true, data: product });
}

// PATCH /api/products/[slug] — admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const body = await req.json();

  const existing = await db.product.findUnique({ where: { slug } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  const parsed = updateProductSchema.safeParse({ ...body, id: existing.id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, images: _images, variants: _variants, ...updateData } = parsed.data;
  const newSlug = updateData.name ? slugify(updateData.name) : undefined;

  // Check for slug collision when renaming
  if (newSlug && newSlug !== slug) {
    const slugTaken = await db.product.findUnique({ where: { slug: newSlug } });
    if (slugTaken) {
      return NextResponse.json(
        { success: false, error: "A product with this name already exists" },
        { status: 409 }
      );
    }
  }

  const product = await db.product.update({
    where: { id },
    data: {
      ...updateData,
      ...(newSlug && { slug: newSlug }),
    },
    include: { images: true, variants: true, category: true },
  });

  // Invalidate caches
  await cacheDel(CACHE_KEYS.PRODUCT_DETAIL(slug));
  if (newSlug && newSlug !== slug) {
    await cacheDel(CACHE_KEYS.PRODUCT_DETAIL(newSlug));
  }
  await cacheDelPattern(`${CACHE_KEYS.PRODUCTS_LIST}:*`);

  return NextResponse.json({ success: true, data: product });
}

// DELETE /api/products/[slug] — admin only (soft-delete: sets isActive=false)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { slug } = await params;

  const product = await db.product.findUnique({ where: { slug } });
  if (!product) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  // Soft-delete: deactivate instead of hard delete to preserve order item references
  await db.product.update({
    where: { slug },
    data: { isActive: false },
  });

  await cacheDel(CACHE_KEYS.PRODUCT_DETAIL(slug));
  await cacheDelPattern(`${CACHE_KEYS.PRODUCTS_LIST}:*`);

  return NextResponse.json({ success: true });
}
