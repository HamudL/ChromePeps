import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createFaqCategorySchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

export async function GET() {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const cats = await db.fAQCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json({ success: true, data: cats });
}

export async function POST(req: NextRequest) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const body = await req.json();
  const parsed = createFaqCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const collision = await db.fAQCategory.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (collision) {
    return NextResponse.json(
      {
        success: false,
        error: `Slug "${parsed.data.slug}" ist bereits vergeben`,
      },
      { status: 409 },
    );
  }

  const cat = await db.fAQCategory.create({
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      sortOrder: parsed.data.sortOrder,
    },
  });
  revalidatePath("/faq");
  return NextResponse.json({ success: true, data: cat }, { status: 201 });
}
