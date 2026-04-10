import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/wishlist — returns current user's wishlist product IDs */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: true, data: [] });
  }

  const items = await db.wishlistItem.findMany({
    where: { userId: session.user.id },
    select: { productId: true },
  });

  return NextResponse.json({
    success: true,
    data: items.map((i) => i.productId),
  });
}

/** POST /api/wishlist — toggle a product in wishlist */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const productId = typeof body.productId === "string" ? body.productId : null;
  if (!productId) {
    return NextResponse.json(
      { success: false, error: "productId required" },
      { status: 400 }
    );
  }

  // Toggle: if exists → remove, otherwise → add
  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true, wishlisted: false });
  }

  await db.wishlistItem.create({
    data: { userId: session.user.id, productId },
  });

  return NextResponse.json({ success: true, wishlisted: true });
}
