export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { FaqItemForm } from "@/components/admin/wissen/faq-item-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditFaqItemPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const [item, categories] = await Promise.all([
    db.fAQItem.findUnique({ where: { id } }),
    db.fAQCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!item) notFound();

  return (
    <FaqItemForm
      mode="edit"
      initial={{
        id: item.id,
        categoryId: item.categoryId,
        question: item.question,
        answer: item.answer,
        sortOrder: item.sortOrder,
        isPublished: item.isPublished,
      }}
      categories={categories}
    />
  );
}
