import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cacheGet, cacheSet, cacheDelPattern } from "@/lib/redis";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import {
  productFilterSchema,
  createProductSchema,
} from "@/validators/product";
import { slugify } from "@/lib/utils";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

// GET /api/products — public, cached, filterable
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  // Two rate-limit layers:
  //   1. A generous overall budget (120/min) — the common case of a user
  //      browsing and changing filters fits comfortably.
  //   2. A tighter anti-cache-bust budget (30/min on the same IP keyed by
  //      `products:ip:`) — a malicious client sending many unique filter
  //      combinations can otherwise bypass the Redis cache and force raw
  //      DB hits. The smaller limit kicks in before we ever touch Postgres.
  const limit = await rateLimit(ip, { maxRequests: 120, windowMs: 60_000 });
  if (!limit.success) return rateLimitExceeded(limit);
  const antiCacheBust = await rateLimit(`products:ip:${ip}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!antiCacheBust.success) return rateLimitExceeded(antiCacheBust);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = productFilterSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const {
    categorySlug,
    search,
    minPrice,
    maxPrice,
    purity,
    inStock,
    sort,
    page,
    pageSize,
  } = parsed.data;

  // Cache key based on all filter params
  const cacheKey = `${CACHE_KEYS.PRODUCTS_LIST}:${JSON.stringify(parsed.data)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, data: cached });
  }

  // Build Prisma where clause
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(categorySlug && {
      category: { slug: categorySlug },
    }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(minPrice !== undefined && {
      priceInCents: { gte: minPrice },
    }),
    ...(maxPrice !== undefined && {
      priceInCents: {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        lte: maxPrice,
      },
    }),
    ...(purity && { purity }),
    ...(inStock && { stock: { gt: 0 } }),
  };

  // Sort
  const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
    switch (sort) {
      case "price_asc":
        return { priceInCents: "asc" as const };
      case "price_desc":
        return { priceInCents: "desc" as const };
      case "name_asc":
        return { name: "asc" as const };
      case "name_desc":
        return { name: "desc" as const };
      default:
        return { createdAt: "desc" as const };
    }
  })();

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDesc: true,
        priceInCents: true,
        compareAtPriceInCents: true,
        purity: true,
        weight: true,
        isActive: true,
        stock: true,
        images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        category: { select: { name: true, slug: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  const result = {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };

  await cacheSet(cacheKey, result, CACHE_TTL.PRODUCTS_LIST);

  return NextResponse.json({ success: true, data: result });
}

// POST /api/products — admin only
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { images, variants, ...productData } = parsed.data;
  const slug = slugify(productData.name);

  const existing = await db.product.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "A product with this name already exists" },
      { status: 409 }
    );
  }

  const product = await db.product.create({
    data: {
      ...productData,
      slug,
      images: images ? { createMany: { data: images } } : undefined,
      variants: variants ? { createMany: { data: variants } } : undefined,
    },
    include: {
      images: true,
      variants: true,
      category: true,
    },
  });

  await cacheDelPattern(`${CACHE_KEYS.PRODUCTS_LIST}:*`);
  // Homepage-Caches (Bestsellers + Categories) werden bei jeder
  // Produkt-Änderung mit invalidiert — neuer Bestseller muss sofort
  // auf der Startseite sichtbar sein, sonst verwirrt es den Admin
  // bei Stichproben.
  await cacheDelPattern("homepage:*");
  revalidatePath("/products");

  return NextResponse.json({ success: true, data: product }, { status: 201 });
}
