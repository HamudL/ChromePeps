import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createBlogCategorySchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

// GET /api/admin/wissen/categories — Liste mit Post-Count
export async function GET() {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const categories = await db.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { posts: true },
      },
    },
  });
  return NextResponse.json({ success: true, data: categories });
}

// POST /api/admin/wissen/categories
export async function POST(req: NextRequest) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const body = await req.json();
  const parsed = createBlogCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const existing = await db.blogCategory.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: `Slug "${parsed.data.slug}" ist bereits vergeben`,
      },
      { status: 409 },
    );
  }

  const cat = await db.blogCategory.create({
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      sortOrder: parsed.data.sortOrder,
    },
  });
  // Hub + neue Category-Page neu rendern
  revalidatePath("/wissen");
  return NextResponse.json({ success: true, data: cat }, { status: 201 });
}
