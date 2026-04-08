import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { addressSchema } from "@/validators/address";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";

// GET /api/addresses — user's addresses
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const addresses = await db.address.findMany({
    where: { userId: session.user.id },
    orderBy: { isDefault: "desc" },
  });

  return NextResponse.json({ success: true, data: addresses });
}

// POST /api/addresses — create address
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const limit = await rateLimit(`addresses:${session.user.id}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const body = await req.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  // If setting as default, unset other defaults
  if (parsed.data.isDefault) {
    await db.address.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await db.address.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json({ success: true, data: address }, { status: 201 });
}
