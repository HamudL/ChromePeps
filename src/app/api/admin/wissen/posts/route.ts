import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createBlogPostSchema } from "@/validators/wissen";
import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

// GET /api/admin/wissen/posts — Liste mit Author + Category eingebettet
// für die Tabelle. Optional ?status=draft|published Filter.
export async function GET(req: NextRequest) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const categoryId = url.searchParams.get("categoryId");

  const posts = await db.blogPost.findMany({
    where: {
      ...(status === "draft" ? { publishedAt: null } : {}),
      ...(status === "published" ? { publishedAt: { not: null } } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      category: { select: { id: true, slug: true, name: true } },
      author: { select: { id: true, slug: true, name: true } },
    },
  });
  return NextResponse.json({ success: true, data: posts });
}

// POST /api/admin/wissen/posts
export async function POST(req: NextRequest) {
  const guard = await requireWissenAdmin();
  if (guard) return guard;

  const body = await req.json();
  const parsed = createBlogPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const slugCollision = await db.blogPost.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (slugCollision) {
    return NextResponse.json(
      {
        success: false,
        error: `Slug "${parsed.data.slug}" ist bereits vergeben`,
      },
      { status: 409 },
    );
  }

  const post = await db.blogPost.create({
    data: {
      slug: parsed.data.slug,
      title: parsed.data.title,
      titleEmphasis: parsed.data.titleEmphasis || null,
      excerpt: parsed.data.excerpt,
      contentMdx: parsed.data.contentMdx,
      coverImage: parsed.data.coverImage || null,
      readingMinutes: parsed.data.readingMinutes,
      authorId: parsed.data.authorId,
      categoryId: parsed.data.categoryId,
      tags: parsed.data.tags,
      relatedGlossarSlugs: parsed.data.relatedGlossarSlugs,
      featuredBatchProductSlug: parsed.data.featuredBatchProductSlug || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      publishedAt: parsed.data.publishedAt ?? null,
      updatedManually: parsed.data.updatedManually ?? null,
    },
    include: {
      category: { select: { slug: true, name: true } },
      author: { select: { slug: true, name: true } },
    },
  });

  revalidatePath("/wissen");
  revalidatePath(`/wissen/${post.slug}`);
  revalidatePath(`/wissen/kategorie/${post.category.slug}`);
  return NextResponse.json({ success: true, data: post }, { status: 201 });
}
