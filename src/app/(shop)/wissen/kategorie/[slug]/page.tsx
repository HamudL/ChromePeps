import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { db } from "@/lib/db";
import { ArticleCard, type ArticleCardData } from "@/components/wissen/article-card";
import { breadcrumbJsonLd } from "@/lib/json-ld";

/**
 * /wissen/kategorie/[slug] — Magazinstil-Liste pro Kategorie.
 *
 * KEIN Card-Grid (Design-Entscheidung Iter 2): redaktionelle List-
 * Variante mit Cover-Thumbnail links + Body rechts.
 *
 * URL-State: ?sort=neueste|alphabetisch|meistgelesen, ?page=N.
 * "Meistgelesen" ist Stub (kein View-Tracking) und mappt auf "neueste".
 */
export const revalidate = 600;

const PAGE_SIZE = 10;

type SortKey = "neueste" | "alphabetisch" | "meistgelesen";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await db.blogCategory.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  if (!cat) return { title: "Kategorie nicht gefunden" };
  return {
    title: `${cat.name} — Wissen`,
    description: cat.description ?? `Beiträge in ${cat.name}.`,
    alternates: { canonical: `/wissen/kategorie/${slug}` },
  };
}

export default async function WissenCategoryPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort: SortKey =
    sp.sort === "alphabetisch" || sp.sort === "meistgelesen"
      ? sp.sort
      : "neueste";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const category = await db.blogCategory.findUnique({
    where: { slug },
  });
  if (!category) notFound();

  // "Meistgelesen" hat kein View-Tracking → fällt auf publishedAt desc
  // zurück. TODO(salih): hook view counter when shipped.
  const orderBy =
    sort === "alphabetisch"
      ? { title: "asc" as const }
      : { publishedAt: "desc" as const };

  const [posts, total] = await Promise.all([
    db.blogPost.findMany({
      where: { categoryId: category.id, publishedAt: { not: null } },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: true },
    }),
    db.blogPost.count({
      where: { categoryId: category.id, publishedAt: { not: null } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allCategories = await db.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
  const myIndex = allCategories.findIndex((c) => c.slug === slug);

  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Wissen", path: "/wissen" },
    { name: category.name, path: `/wissen/kategorie/${slug}` },
  ]);

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {/* Compact category hero */}
      <section className="border-b border-border relative overflow-hidden">
        <div
          className="absolute inset-0 apo-grid opacity-100"
          aria-hidden="true"
        />
        <div className="container relative py-12 md:py-16">
          <nav
            aria-label="Breadcrumb"
            className="mono-label text-muted-foreground flex items-center gap-2"
            style={{ fontSize: 10.5 }}
          >
            <Link href="/wissen" className="hover:text-foreground">
              Wissen
            </Link>
            <ChevronRight size={11} />
            <span className="text-foreground">{category.name}</span>
          </nav>

          <div className="mt-5 flex items-end justify-between gap-8 flex-wrap">
            <div>
              <span className="mono-tag text-primary">
                Kategorie · {String(myIndex + 1).padStart(2, "0")} /{" "}
                {String(allCategories.length).padStart(2, "0")}
              </span>
              <h1 className="mt-3 font-serif text-[44px] md:text-[60px] leading-[1.04] tracking-[-0.02em] font-medium">
                {category.name}.
              </h1>
              {category.description && (
                <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-foreground/85">
                  {category.description}
                </p>
              )}
            </div>
            <dl
              className="grid grid-cols-2 gap-x-8 gap-y-2 self-end font-mono text-[12px]"
              style={{ letterSpacing: "0.02em" }}
            >
              <div>
                <dt className="mono-tag text-muted-foreground">Artikel</dt>
                <dd className="mt-1 text-[24px] font-semibold tabular-nums">
                  {total}
                </dd>
              </div>
              <div>
                <dt className="mono-tag text-muted-foreground">Update</dt>
                <dd className="mt-1 text-[14px]">
                  {category.updatedAt.toLocaleDateString("de-DE")}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <section
        className="border-b border-border sticky top-0 z-30 backdrop-blur"
        style={{ background: "hsl(var(--background) / 0.96)" }}
      >
        <div className="container py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="mono-tag text-muted-foreground mr-2"
              style={{ fontSize: 10 }}
            >
              Sortieren
            </span>
            <div className="flex gap-1">
              {(
                [
                  { id: "neueste", label: "Neueste" },
                  { id: "meistgelesen", label: "Meistgelesen" },
                  { id: "alphabetisch", label: "A–Z" },
                ] as const
              ).map((o) => {
                const isActive = sort === o.id;
                return (
                  <Link
                    key={o.id}
                    href={`/wissen/kategorie/${slug}?sort=${o.id}`}
                    className={`mono-label px-3 py-1.5 rounded-sm transition-colors ${
                      isActive
                        ? "bg-ink text-ink-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={{ fontSize: 10.5 }}
                  >
                    {o.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="ml-auto relative w-full md:w-72">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              placeholder={`In ${category.name} suchen…`}
              disabled
              className="w-full bg-white border border-border rounded-sm py-2 pl-9 pr-3 text-[13px] font-sans focus:border-primary focus:outline-none disabled:opacity-50"
              title="Suche kommt in einer eigenen Iteration."
            />
          </div>
        </div>
      </section>

      {/* Editorial list */}
      <section className="container">
        <div className="max-w-[920px] mx-auto py-10 md:py-14">
          {posts.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground">
              Noch keine Artikel in dieser Kategorie.
            </p>
          ) : (
            <div className="border-t border-foreground/95">
              {posts.map((p) => (
                <ArticleCard
                  key={p.slug}
                  article={toCardData(p)}
                  variant="list"
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="Seitennavigation"
              className="mt-12 pt-8 border-t border-border flex items-center justify-between"
            >
              {page > 1 ? (
                <Link
                  href={`/wissen/kategorie/${slug}?sort=${sort}&page=${page - 1}`}
                  className="btn-ghost text-[13px]"
                >
                  <ChevronLeft size={13} /> Vorherige
                </Link>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(
                  (n) => (
                    <Link
                      key={n}
                      href={`/wissen/kategorie/${slug}?sort=${sort}&page=${n}`}
                      className={`pagination-num ${page === n ? "active" : ""}`}
                    >
                      {n}
                    </Link>
                  ),
                )}
                {totalPages > 5 && (
                  <>
                    <span className="px-2 font-mono text-[13px] text-muted-foreground">
                      …
                    </span>
                    <Link
                      href={`/wissen/kategorie/${slug}?sort=${sort}&page=${totalPages}`}
                      className={`pagination-num ${page === totalPages ? "active" : ""}`}
                    >
                      {totalPages}
                    </Link>
                  </>
                )}
              </div>
              {page < totalPages ? (
                <Link
                  href={`/wissen/kategorie/${slug}?sort=${sort}&page=${page + 1}`}
                  className="btn-ghost text-[13px]"
                >
                  Nächste <ChevronRight size={13} />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
          {totalPages > 1 && (
            <p
              className="mt-4 mono-label text-muted-foreground text-center"
              style={{ fontSize: 10 }}
            >
              Seite {page} von {totalPages} · {posts.length} von {total} Artikeln
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

type PostWithCategory = Awaited<ReturnType<typeof db.blogPost.findFirst>> & {
  category: { name: string; slug: string };
};

function toCardData(post: NonNullable<PostWithCategory>): ArticleCardData {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    authorName: post.authorName,
    readingMinutes: post.readingMinutes,
    publishedAt: post.publishedAt!,
    category: { name: post.category.name, slug: post.category.slug },
  };
}
