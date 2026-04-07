import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/promos/validate — validate a promo code for the current user
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Please sign in to use promo codes" },
      { status: 401 }
    );
  }

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

  // Check active
  if (!promo.isActive) {
    return NextResponse.json(
      { success: false, error: "This promo code is no longer active" },
      { status: 400 }
    );
  }

  // Check dates
  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) {
    return NextResponse.json(
      { success: false, error: "This promo code is not yet valid" },
      { status: 400 }
    );
  }
  if (promo.expiresAt && promo.expiresAt < now) {
    return NextResponse.json(
      { success: false, error: "This promo code has expired" },
      { status: 400 }
    );
  }

  // Check max uses
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return NextResponse.json(
      { success: false, error: "This promo code has reached its usage limit" },
      { status: 400 }
    );
  }

  // Check if user already used this code
  const alreadyUsed = await db.promoUsage.findFirst({
    where: { promoId: promo.id, userId: session.user.id },
  });
  if (alreadyUsed) {
    return NextResponse.json(
      { success: false, error: "You have already used this promo code" },
      { status: 400 }
    );
  }

  // Check minimum order
  if (promo.minOrderCents && subtotalInCents < promo.minOrderCents) {
    const minEur = (promo.minOrderCents / 100).toFixed(2);
    return NextResponse.json(
      {
        success: false,
        error: `Minimum order of ${minEur} EUR required for this code`,
      },
      { status: 400 }
    );
  }

  // Calculate discount
  let discountAmount: number;
  if (promo.discountType === "PERCENTAGE") {
    discountAmount = Math.round((subtotalInCents * promo.discountValue) / 100);
  } else {
    discountAmount = Math.min(promo.discountValue, subtotalInCents);
  }

  return NextResponse.json({
    success: true,
    data: {
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountAmount,
      description: promo.description,
    },
  });
}
