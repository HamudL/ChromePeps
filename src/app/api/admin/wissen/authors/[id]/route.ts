import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateAuthorSchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

// GET /api/admin/wissen/authors/[id]
export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const author = await db.author.findUnique({
    where: { id },
    include: { _count: { select: { posts: true } } },
  });
  if (!author) {
    return NextResponse.json(
      { success: false, error: "Author nicht gefunden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: author });
}

// PATCH /api/admin/wissen/authors/[id]
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const body = await req.json();
  const parsed = updateAuthorSchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }
  const { id: _id, ...data } = parsed.data;
  void _id;

  // Slug-Kollision (außer mit sich selbst)
  if (data.slug) {
    const collision = await db.author.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });
    if (collision) {
      return NextResponse.json(
        { success: false, error: `Slug "${data.slug}" ist bereits vergeben` },
        { status: 409 },
      );
    }
  }

  const author = await db.author.update({
    where: { id },
    data,
  });
  return NextResponse.json({ success: true, data: author });
}

// DELETE /api/admin/wissen/authors/[id] — nur wenn keine Posts dranhängen
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const postCount = await db.blogPost.count({ where: { authorId: id } });
  if (postCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Author hat ${postCount} verknüpfte Posts. Erst die Posts auf einen anderen Author umstellen oder löschen.`,
      },
      { status: 409 },
    );
  }

  await db.author.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
