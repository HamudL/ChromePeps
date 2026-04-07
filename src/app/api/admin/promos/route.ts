import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createPromoCodeSchema } from "@/validators/promo";

// GET /api/admin/promos — list all promo codes (admin only)
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const promos = await db.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { usages: true } } },
  });

  return NextResponse.json({ success: true, data: promos });
}

// POST /api/admin/promos — create a new promo code (admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = createPromoCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  // Check for duplicate code
  const existing = await db.promoCode.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Promo code already exists" },
      { status: 409 }
    );
  }

  // Validate percentage is <= 100
  if (
    parsed.data.discountType === "PERCENTAGE" &&
    parsed.data.discountValue > 100
  ) {
    return NextResponse.json(
      { success: false, error: "Percentage discount cannot exceed 100%" },
      { status: 400 }
    );
  }

  const promo = await db.promoCode.create({
    data: {
      code: parsed.data.code,
      description: parsed.data.description ?? null,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      maxUses: parsed.data.maxUses ?? null,
      minOrderCents: parsed.data.minOrderCents ?? null,
      isActive: parsed.data.isActive,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      expiresAt: parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null,
    },
  });

  return NextResponse.json({ success: true, data: promo }, { status: 201 });
}
