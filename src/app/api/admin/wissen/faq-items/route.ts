import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createFaqItemSchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

export async function GET(req: NextRequest) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const url = new URL(req.url);
  const categoryId = url.searchParams.get("categoryId");

  const items = await db.fAQItem.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
    include: { category: { select: { id: true, slug: true, name: true } } },
  });
  return NextResponse.json({ success: true, data: items });
}

export async function POST(req: NextRequest) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const body = await req.json();
  const parsed = createFaqItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const item = await db.fAQItem.create({
    data: {
      categoryId: parsed.data.categoryId,
      question: parsed.data.question,
      answer: parsed.data.answer,
      sortOrder: parsed.data.sortOrder,
      isPublished: parsed.data.isPublished,
    },
  });
  revalidatePath("/faq");
  return NextResponse.json({ success: true, data: item }, { status: 201 });
}
