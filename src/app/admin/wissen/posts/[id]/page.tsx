export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { BlogPostForm } from "@/components/admin/wissen/blog-post-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const [post, categories, authors, products, glossarTerms] = await Promise.all([
    db.blogPost.findUnique({
      where: { id },
      include: {
        category: { select: { id: true } },
        author: { select: { id: true } },
      },
    }),
    db.blogCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true },
    }),
    db.author.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        title: true,
        bio: true,
        orcid: true,
      },
    }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { slug: true },
    }),
    db.glossarTerm.findMany({
      orderBy: { term: "asc" },
      select: { slug: true },
    }),
  ]);

  if (!post) notFound();

  return (
    <BlogPostForm
      mode="edit"
      initial={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        titleEmphasis: post.titleEmphasis,
        excerpt: post.excerpt,
        contentMdx: post.contentMdx,
        coverImage: post.coverImage,
        readingMinutes: post.readingMinutes,
        authorId: post.author.id,
        categoryId: post.category.id,
        tags: post.tags,
        relatedGlossarSlugs: post.relatedGlossarSlugs,
        featuredBatchProductSlug: post.featuredBatchProductSlug,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        publishedAt: post.publishedAt,
        updatedManually: post.updatedManually,
      }}
      categories={categories}
      authors={authors}
      productSlugs={products.map((p) => p.slug)}
      glossarSlugs={glossarTerms.map((g) => g.slug)}
    />
  );
}
