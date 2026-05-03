export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { AuthorForm } from "@/components/admin/wissen/author-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditWissenAuthorPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const author = await db.author.findUnique({
    where: { id },
    include: { _count: { select: { posts: true } } },
  });
  if (!author) notFound();

  return (
    <AuthorForm
      mode="edit"
      initial={{
        id: author.id,
        slug: author.slug,
        name: author.name,
        title: author.title,
        bio: author.bio,
        avatar: author.avatar,
        orcid: author.orcid,
        postCount: author._count.posts,
      }}
    />
  );
}
