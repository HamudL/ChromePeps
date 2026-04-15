import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { checkPromoApplicability } from "@/lib/order/promo-applicability";

// POST /api/promos/validate — validate a promo code for the current user
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Please sign in to use promo codes" },
      { status: 401 }
    );
  }

  const limit = await rateLimit(`promo-validate:${session.user.id}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const body = await req.json();
  const code = (body.code ?? "").trim().toUpperCase();
  const subtotalInCents: number = body.subtotalInCents ?? 0;

  if (!code) {
    return NextResponse.json(
      { success: false, error: "Please enter a promo code" },
      { status: 400 }
    );
  }

  const promo = await db.promoCode.findUnique({ where: { code } });

  if (!promo) {
    return NextResponse.json(
      { success: false, error: "Invalid promo code" },
      { status: 404 }
    );
  }

  // Whether the current user has already redeemed this code. This is
  // the only check that depends on the DB and can't live in the pure
  // helper.
  const alreadyUsed = !!(await db.promoUsage.findFirst({
    where: { promoId: promo.id, userId: session.user.id },
  }));

  // All other rules (active, dates, max-uses, min-order, discount
  // calculation) are delegated to the shared pure helper so this
  // endpoint, POST /api/stripe/checkout, and POST /api/checkout/
  // bank-transfer all agree on what "valid" means.
  const check = checkPromoApplicability({
    promo,
    now: new Date(),
    subtotalInCents,
    alreadyUsedByUser: alreadyUsed,
  });

  if (!check.applicable) {
    return NextResponse.json(
      { success: false, error: check.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountAmount: check.discountInCents,
      description: promo.description,
    },
  });
}
