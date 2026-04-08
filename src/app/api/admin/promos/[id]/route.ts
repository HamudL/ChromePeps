import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { updatePromoCodeSchema } from "@/validators/promo";

// PATCH /api/admin/promos/[id] — update promo code
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updatePromoCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const existing = await db.promoCode.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Promo code not found" },
      { status: 404 }
    );
  }

  // If code is changing, check for duplicates
  if (parsed.data.code && parsed.data.code !== existing.code) {
    const dup = await db.promoCode.findUnique({
      where: { code: parsed.data.code },
    });
    if (dup) {
      return NextResponse.json(
        { success: false, error: "Promo code already exists" },
        { status: 409 }
      );
    }
  }

  // Cross-validate discountType and discountValue (handles partial updates)
  const effectiveType = parsed.data.discountType ?? existing.discountType;
  const effectiveValue = parsed.data.discountValue ?? existing.discountValue;
  if (effectiveType === "PERCENTAGE" && effectiveValue > 100) {
    return NextResponse.json(
      { success: false, error: "Percentage discount cannot exceed 100%" },
      { status: 400 }
    );
  }

  const updated = await db.promoCode.update({
    where: { id },
    data: {
      ...(parsed.data.code !== undefined && { code: parsed.data.code }),
      ...(parsed.data.description !== undefined && {
        description: parsed.data.description,
      }),
      ...(parsed.data.discountType !== undefined && {
        discountType: parsed.data.discountType,
      }),
      ...(parsed.data.discountValue !== undefined && {
        discountValue: parsed.data.discountValue,
      }),
      ...(parsed.data.maxUses !== undefined && {
        maxUses: parsed.data.maxUses,
      }),
      ...(parsed.data.minOrderCents !== undefined && {
        minOrderCents: parsed.data.minOrderCents,
      }),
      ...(parsed.data.isActive !== undefined && {
        isActive: parsed.data.isActive,
      }),
      ...(parsed.data.startsAt !== undefined && {
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      }),
      ...(parsed.data.expiresAt !== undefined && {
        expiresAt: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null,
      }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/admin/promos/[id] — delete promo code
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const existing = await db.promoCode.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Promo code not found" },
      { status: 404 }
    );
  }

  await db.promoCode.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
