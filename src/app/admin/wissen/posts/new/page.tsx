export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { BlogPostForm } from "@/components/admin/wissen/blog-post-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

/**
 * Create-Page für einen neuen Blog-Post. Lädt Categories, Authors,
 * aktive Produkt-Slugs und Glossar-Slugs für die Picker.
 *
 * Wenn keine Author oder Category existiert, wird ein Hinweis-Banner
 * angezeigt — sonst wäre der Form unbenutzbar.
 */
export default async function NewBlogPostPage() {
  await requireAdmin();

  const [categories, authors, products, glossarTerms] = await Promise.all([
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

  if (categories.length === 0 || authors.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-4">
        <h2 className="text-xl font-semibold">Voraussetzung fehlt</h2>
        <p className="text-muted-foreground">
          Um einen Artikel anzulegen, brauchst du mindestens eine Kategorie
          und einen Autor.
        </p>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/wissen/categories/new">
                Kategorie anlegen <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          )}
          {authors.length === 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/wissen/authors/new">
                Autor anlegen <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <BlogPostForm
      mode="create"
      initial={{}}
      categories={categories}
      authors={authors}
      productSlugs={products.map((p) => p.slug)}
      glossarSlugs={glossarTerms.map((g) => g.slug)}
    />
  );
}
