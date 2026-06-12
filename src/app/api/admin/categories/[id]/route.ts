import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { cacheDel, cacheDelPattern } from "@/lib/redis";
import { invalidateShopCategoriesCache } from "@/lib/shop/categories";
import { updateCategorySchema } from "@/validators/product";
import { slugify } from "@/lib/utils";
import { CACHE_KEYS } from "@/lib/constants";

// PATCH /api/admin/categories/[id]
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
  // Expliziter 400 nötig: `{ ...null, id }` würde das all-optionale
  // Update-Schema passieren und ein leeres Update ausführen.
  const body = await parseJsonBody(req);
  if (body === null) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const parsed = updateCategorySchema.safeParse({
    ...(body as Record<string, unknown>),
    id,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...updateData } = parsed.data;
  const slug = updateData.name ? slugify(updateData.name) : undefined;

  const category = await db.category.update({
    where: { id },
    data: { ...updateData, ...(slug && { slug }) },
  });

  await cacheDel(CACHE_KEYS.CATEGORIES);
  // Shop-Variante der Kategorie-Liste (FilterBar) mit invalidieren.
  await invalidateShopCategoriesCache();
  await cacheDelPattern(`${CACHE_KEYS.PRODUCTS_LIST}:*`);
  await cacheDelPattern("homepage:*");

  return NextResponse.json({ success: true, data: category });
}

// DELETE /api/admin/categories/[id]
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

  const productCount = await db.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot delete: ${productCount} products still in this category`,
      },
      { status: 400 }
    );
  }

  await db.category.delete({ where: { id } });

  await cacheDel(CACHE_KEYS.CATEGORIES);
  // Shop-Variante der Kategorie-Liste (FilterBar) mit invalidieren.
  await invalidateShopCategoriesCache();
  await cacheDelPattern("homepage:*");

  return NextResponse.json({ success: true });
}
