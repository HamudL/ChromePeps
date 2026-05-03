import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { updateFaqCategorySchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const cat = await db.fAQCategory.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!cat) {
    return NextResponse.json(
      { success: false, error: "FAQ-Kategorie nicht gefunden" },
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
  const parsed = updateFaqCategorySchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }
  const { id: _id, ...data } = parsed.data;
  void _id;

  if (data.slug) {
    const collision = await db.fAQCategory.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });
    if (collision) {
      return NextResponse.json(
        { success: false, error: `Slug "${data.slug}" ist bereits vergeben` },
        { status: 409 },
      );
    }
  }

  const cat = await db.fAQCategory.update({ where: { id }, data });
  revalidatePath("/faq");
  return NextResponse.json({ success: true, data: cat });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const itemCount = await db.fAQItem.count({ where: { categoryId: id } });
  if (itemCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Kategorie hat ${itemCount} Items. Erst Items löschen oder umhängen.`,
      },
      { status: 409 },
    );
  }

  await db.fAQCategory.delete({ where: { id } });
  revalidatePath("/faq");
  return NextResponse.json({ success: true });
}
