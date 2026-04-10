import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/reviews/eligibility?productId=...
 * Returns the review eligibility state for the current user.
 * Used by the client-side ReviewSection to avoid calling auth() in the
 * product detail page (which would prevent ISR caching).
 */
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ isLoggedIn: false, canReview: false, alreadyReviewed: false });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ isLoggedIn: false, canReview: false, alreadyReviewed: false });
  }

  const [hasPurchase, existingReview] = await Promise.all([
    db.orderItem.findFirst({
      where: {
        productId,
        order: { userId: session.user.id, status: "DELIVERED" },
      },
      select: { id: true },
    }),
    db.review.findFirst({
      where: { productId, userId: session.user.id },
      select: { id: true },
    }),
  ]);

  return NextResponse.json({
    isLoggedIn: true,
    canReview: !!hasPurchase,
    alreadyReviewed: !!existingReview,
  });
}
