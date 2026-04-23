import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { createCategorySchema } from "@/validators/product";
import { slugify } from "@/lib/utils";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/constants";

// GET /api/admin/categories — admin only (trotz des Cache-Keys ist
// das ein Admin-Endpunkt: aufgerufen nur von Pages unter /admin/**).
// Die öffentliche Kategorie-Liste wird in shop-pages server-side direkt
// aus der DB gelesen, nicht von hier.
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const cached = await cacheGet(CACHE_KEYS.CATEGORIES);
  if (cached) {
    return NextResponse.json({ success: true, data: cached });
  }

  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  await cacheSet(CACHE_KEYS.CATEGORIES, categories, CACHE_TTL.CATEGORIES);

  return NextResponse.json({ success: true, data: categories });
}

// POST /api/admin/categories — admin only
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const slug = slugify(parsed.data.name);
  const existing = await db.category.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Category already exists" },
      { status: 409 }
    );
  }

  const category = await db.category.create({
    data: { ...parsed.data, slug },
  });

  await cacheDel(CACHE_KEYS.CATEGORIES);

  return NextResponse.json({ success: true, data: category }, { status: 201 });
}
