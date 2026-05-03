import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { updateBlogPostSchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const post = await db.blogPost.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, slug: true, name: true } },
      author: { select: { id: true, slug: true, name: true, title: true, bio: true, avatar: true, orcid: true } },
    },
  });
  if (!post) {
    return NextResponse.json(
      { success: false, error: "Post nicht gefunden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: post });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const body = await req.json();
  const parsed = updateBlogPostSchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }
  const { id: _id, ...data } = parsed.data;
  void _id;

  if (data.slug) {
    const collision = await db.blogPost.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });
    if (collision) {
      return NextResponse.json(
        { success: false, error: `Slug "${data.slug}" ist bereits vergeben` },
        { status: 409 },
      );
    }
  }

  const existing = await db.blogPost.findUnique({
    where: { id },
    include: { category: { select: { slug: true } } },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Post nicht gefunden" },
      { status: 404 },
    );
  }

  const post = await db.blogPost.update({
    where: { id },
    data,
    include: { category: { select: { slug: true } } },
  });

  // Cache-Invalidation: Hub, alte+neue Slug-Page, alte+neue Category-Page
  revalidatePath("/wissen");
  if (existing.slug !== post.slug) revalidatePath(`/wissen/${existing.slug}`);
  revalidatePath(`/wissen/${post.slug}`);
  if (existing.category.slug !== post.category.slug) {
    revalidatePath(`/wissen/kategorie/${existing.category.slug}`);
  }
  revalidatePath(`/wissen/kategorie/${post.category.slug}`);
  return NextResponse.json({ success: true, data: post });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;
  const { id } = await params;

  const existing = await db.blogPost.findUnique({
    where: { id },
    include: { category: { select: { slug: true } } },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Post nicht gefunden" },
      { status: 404 },
    );
  }

  await db.blogPost.delete({ where: { id } });
  revalidatePath("/wissen");
  revalidatePath(`/wissen/${existing.slug}`);
  revalidatePath(`/wissen/kategorie/${existing.category.slug}`);
  return NextResponse.json({ success: true });
}
