import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cacheDelPattern } from "@/lib/redis";
import { CACHE_KEYS } from "@/lib/constants";

/**
 * PATCH /api/admin/products/reorder
 *
 * Bulk-Update der `sortOrder`-Spalte. Body:
 *   { updates: [{ id: string, sortOrder: number }, ...] }
 *
 * Wird vom Admin-DnD-List nach jedem Drop aufgerufen. Schreibt die
 * neuen Positionen in einer einzigen Transaction, damit entweder
 * alle oder keine Änderungen greifen — andernfalls könnten Teil-
 * Updates die Reihenfolge inkonsistent zurücklassen.
 *
 * Anschließend wird der Products-Cache invalidiert, damit die Shop-
 * Listings sofort die neue Reihenfolge sehen.
 */

const reorderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().cuid(),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(500),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { updates } = parsed.data;

  await db.$transaction(
    updates.map(({ id, sortOrder }) =>
      db.product.update({
        where: { id },
        data: { sortOrder },
      }),
    ),
  );

  // Invalidiere alle Listen-Caches und alle Produkt-Detail-Caches.
  // Pattern-Match weil Detail-Keys den Slug im Suffix tragen.
  await cacheDelPattern(`${CACHE_KEYS.PRODUCTS_LIST}*`);
  await cacheDelPattern("products:detail:*");

  return NextResponse.json({
    success: true,
    data: { updated: updates.length },
  });
}
