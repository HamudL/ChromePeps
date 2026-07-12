import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, isPrismaUniqueError } from "@/lib/db";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";

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

  const limit = await rateLimit(`wishlist:${session.user.id}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  // Kaputtes JSON → 400 unten ("productId required") statt 500.
  const body = ((await parseJsonBody(req)) ?? {}) as { productId?: unknown };
  const productId = typeof body.productId === "string" ? body.productId : null;
  if (!productId) {
    return NextResponse.json(
      { success: false, error: "productId required" },
      { status: 400 }
    );
  }

  // FK-Validierung vorab: eine erfundene productId würde beim create sonst
  // als Foreign-Key-Verletzung (P2003) zum unbehandelten 500 → sauberer 404.
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  // Toggle: if exists → remove, otherwise → add. deleteMany statt
  // findUnique+delete macht das Entfernen idempotent (ein paralleler Toggle
  // löscht dann 0 Zeilen, statt über eine fehlende id zu stolpern).
  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });

  if (existing) {
    await db.wishlistItem.deleteMany({
      where: { userId: session.user.id, productId },
    });
    return NextResponse.json({ success: true, wishlisted: false });
  }

  try {
    await db.wishlistItem.create({
      data: { userId: session.user.id, productId },
    });
    return NextResponse.json({ success: true, wishlisted: true });
  } catch (err: unknown) {
    // Race: ein paralleler Toggle hat die Zeile zwischen findUnique und
    // create bereits angelegt (@@unique([userId, productId]) → P2002).
    // Idempotent als "wishlisted" behandeln statt 500.
    if (isPrismaUniqueError(err)) {
      return NextResponse.json({ success: true, wishlisted: true });
    }
    // Produkt wurde zwischen Existenz-Check und Insert gelöscht (FK P2003).
    if (
      !!err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2003"
    ) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }
    throw err;
  }
}
