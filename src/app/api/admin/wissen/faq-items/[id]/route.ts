import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { updateFaqItemSchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const item = await db.fAQItem.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!item) {
    return NextResponse.json(
      { success: false, error: "FAQ-Item nicht gefunden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: item });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const body = await req.json();
  const parsed = updateFaqItemSchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }
  const { id: _id, ...data } = parsed.data;
  void _id;

  const item = await db.fAQItem.update({ where: { id }, data });
  revalidatePath("/faq");
  return NextResponse.json({ success: true, data: item });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  await db.fAQItem.delete({ where: { id } });
  revalidatePath("/faq");
  return NextResponse.json({ success: true });
}
