export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { CategoryForm } from "@/components/admin/wissen/category-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditWissenCategoryPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const cat = await db.blogCategory.findUnique({
    where: { id },
    include: { _count: { select: { posts: true } } },
  });
  if (!cat) notFound();

  return (
    <CategoryForm
      mode="edit"
      initial={{
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        postCount: cat._count.posts,
      }}
    />
  );
}
