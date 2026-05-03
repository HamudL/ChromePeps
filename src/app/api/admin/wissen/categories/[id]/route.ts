import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { updateBlogCategorySchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const cat = await db.blogCategory.findUnique({
    where: { id },
    include: { _count: { select: { posts: true } } },
  });
  if (!cat) {
    return NextResponse.json(
      { success: false, error: "Kategorie nicht gefunden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: cat });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const body = await req.json();
  const parsed = updateBlogCategorySchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }
  const { id: _id, ...data } = parsed.data;
  void _id;

  if (data.slug) {
    const collision = await db.blogCategory.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });
    if (collision) {
      return NextResponse.json(
        { success: false, error: `Slug "${data.slug}" ist bereits vergeben` },
        { status: 409 },
      );
    }
  }

  const existing = await db.blogCategory.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Kategorie nicht gefunden" },
      { status: 404 },
    );
  }

  const cat = await db.blogCategory.update({ where: { id }, data });

  // Cache invalidation: Hub-Page + alte/neue Category-Page
  revalidatePath("/wissen");
  if (existing.slug !== cat.slug) {
    revalidatePath(`/wissen/kategorie/${existing.slug}`);
  }
  revalidatePath(`/wissen/kategorie/${cat.slug}`);
  return NextResponse.json({ success: true, data: cat });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const postCount = await db.blogPost.count({ where: { categoryId: id } });
  if (postCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Kategorie hat ${postCount} verknüpfte Posts. Erst Posts in andere Kategorien verschieben oder löschen.`,
      },
      { status: 409 },
    );
  }
  const existing = await db.blogCategory.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Kategorie nicht gefunden" },
      { status: 404 },
    );
  }

  await db.blogCategory.delete({ where: { id } });
  revalidatePath("/wissen");
  revalidatePath(`/wissen/kategorie/${existing.slug}`);
  return NextResponse.json({ success: true });
}
