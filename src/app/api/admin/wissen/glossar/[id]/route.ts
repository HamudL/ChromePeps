import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { updateGlossarTermSchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const term = await db.glossarTerm.findUnique({ where: { id } });
  if (!term) {
    return NextResponse.json(
      { success: false, error: "Glossar-Term nicht gefunden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: term });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const body = await req.json();
  const parsed = updateGlossarTermSchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }
  const { id: _id, ...data } = parsed.data;
  void _id;

  if (data.slug) {
    const collision = await db.glossarTerm.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });
    if (collision) {
      return NextResponse.json(
        { success: false, error: `Slug "${data.slug}" ist bereits vergeben` },
        { status: 409 },
      );
    }
  }

  const term = await db.glossarTerm.update({ where: { id }, data });
  revalidatePath("/wissen/glossar");
  return NextResponse.json({ success: true, data: term });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  await db.glossarTerm.delete({ where: { id } });
  revalidatePath("/wissen/glossar");
  return NextResponse.json({ success: true });
}
