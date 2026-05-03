export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { GlossarForm } from "@/components/admin/wissen/glossar-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditGlossarTermPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const [term, posts] = await Promise.all([
    db.glossarTerm.findUnique({ where: { id } }),
    db.blogPost.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { title: "asc" },
      select: { slug: true },
    }),
  ]);
  if (!term) notFound();

  return (
    <GlossarForm
      mode="edit"
      initial={{
        id: term.id,
        slug: term.slug,
        term: term.term,
        acronym: term.acronym,
        shortDef: term.shortDef,
        longDef: term.longDef,
        relatedPostSlugs: term.relatedPostSlugs,
      }}
      postSlugs={posts.map((p) => p.slug)}
    />
  );
}
