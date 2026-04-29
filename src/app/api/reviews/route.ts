import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createReviewSchema } from "@/validators/review";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { cacheDel } from "@/lib/redis";
import { CACHE_KEYS } from "@/lib/constants";

/**
 * GET /api/reviews?productId=X&offset=Y&limit=N
 *
 * Lazy-Load-Endpoint für die Review-Liste auf der Produkt-Detailseite.
 * Initial werden die ersten 20 Reviews vom SSR mitgeliefert (siehe
 * `/(shop)/products/[slug]/page.tsx` REVIEWS_INITIAL_TAKE), weitere
 * Blöcke werden vom <ReviewList>-Client per Klick auf "Mehr laden"
 * angefordert.
 *
 * Public-Endpoint — Review-Inhalte sind ohnehin auf der Detailseite
 * sichtbar, kein Auth-Gate nötig.
 */
const listReviewsSchema = z.object({
  productId: z.string().cuid(),
  offset: z.number().int().min(0).max(10_000).default(0),
  limit: z.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const parsed = listReviewsSchema.safeParse({
    productId: url.searchParams.get("productId") ?? "",
    offset: parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
    limit: parseInt(url.searchParams.get("limit") ?? "20", 10) || 20,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const reviews = await db.review.findMany({
    where: { productId: parsed.data.productId },
    orderBy: { createdAt: "desc" },
    skip: parsed.data.offset,
    take: parsed.data.limit,
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      isVerified: true,
      createdAt: true,
      user: { select: { name: true, image: true } },
    },
  });

  // Date → ISO-String für Client-Component-Boundary (JSON-safe).
  return NextResponse.json({
    success: true,
    data: reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

/**
 * POST /api/reviews
 *
 * Creates a review. Only users who have actually purchased the product
 * (DELIVERED order containing it) are allowed to submit. Each user can
 * submit exactly ONE review per product — repeat calls are blocked by the
 * `@@unique([userId, productId])` constraint and return 409.
 *
 * isVerified is always true here because the purchase check is strict.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const limit = await rateLimit(`reviews:${session.user.id}`, {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid body" },
      { status: 400 }
    );
  }

  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  // Sanity-check the product exists and is active.
  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, slug: true, isActive: true },
  });
  if (!product || !product.isActive) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  // Verified-purchase gate: user must have a DELIVERED order containing this
  // product. We match by productId (not by variant) so every variant of a
  // product is enough to unlock the review for the product page.
  const hasPurchase = await db.orderItem.findFirst({
    where: {
      productId: product.id,
      order: {
        userId: session.user.id,
        status: "DELIVERED",
      },
    },
    select: { id: true },
  });

  if (!hasPurchase) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Sie k\u00f6nnen nur Produkte bewerten, die Sie bereits als geliefert erhalten haben.",
      },
      { status: 403 }
    );
  }

  // Create the review. If a review already exists for (userId, productId),
  // the unique constraint throws P2002 — surface that as 409.
  try {
    const review = await db.review.create({
      data: {
        userId: session.user.id,
        productId: product.id,
        rating: parsed.data.rating,
        title: parsed.data.title?.trim() || null,
        body: parsed.data.body?.trim() || null,
        isVerified: true,
      },
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Bust the cached product-detail payload so the new review appears on
    // the next page load.
    await cacheDel(CACHE_KEYS.PRODUCT_DETAIL(product.slug));

    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (err: unknown) {
    const isUnique =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (isUnique) {
      return NextResponse.json(
        {
          success: false,
          error: "Sie haben dieses Produkt bereits bewertet.",
        },
        { status: 409 }
      );
    }
    throw err;
  }
}
