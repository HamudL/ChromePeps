export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { GlossarForm } from "@/components/admin/wissen/glossar-form";

export default async function NewGlossarTermPage() {
  await requireAdmin();
  const posts = await db.blogPost.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { title: "asc" },
    select: { slug: true },
  });
  return (
    <GlossarForm
      mode="create"
      initial={{}}
      postSlugs={posts.map((p) => p.slug)}
    />
  );
}
