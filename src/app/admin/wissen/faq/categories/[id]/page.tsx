export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { FaqCategoryForm } from "@/components/admin/wissen/faq-category-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditFaqCategoryPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const cat = await db.fAQCategory.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  });
  if (!cat) notFound();

  return (
    <FaqCategoryForm
      mode="edit"
      initial={{
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        itemCount: cat._count.items,
      }}
    />
  );
}
