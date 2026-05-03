export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { FaqItemForm } from "@/components/admin/wissen/faq-item-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface Props {
  searchParams: Promise<{ categoryId?: string }>;
}

export default async function NewFaqItemPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;

  const categories = await db.fAQCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  if (categories.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-4">
        <h2 className="text-xl font-semibold">FAQ-Kategorie fehlt</h2>
        <p className="text-muted-foreground">
          Lege zuerst eine Kategorie an — sonst kann das Item nicht
          zugeordnet werden.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/wissen/faq/categories/new">
            Kategorie anlegen <ArrowRight className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <FaqItemForm
      mode="create"
      initial={{ categoryId: sp.categoryId }}
      categories={categories}
    />
  );
}
