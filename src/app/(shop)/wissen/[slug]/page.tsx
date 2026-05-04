import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { ArticleCard, type ArticleCardData } from "@/components/wissen/article-card";
import { ArticleBody } from "@/components/wissen/article-body";
import { BatchInfoCard } from "@/components/wissen/batch-info-card";
import { BlogPostViewTracker } from "@/components/wissen/blog-post-view-tracker";
import { CategoryBadge } from "@/components/wissen/category-badge";
import { CoverPlaceholder } from "@/components/wissen/cover-placeholder";
import { MetaLine } from "@/components/wissen/meta-line";
import { TocList } from "@/components/wissen/toc-list";
import { extractToc } from "@/lib/wissen/extract-toc";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";

/**
 * /wissen/[slug] — Wissens-Artikel-Detailseite.
 *
 * 3-Spalten-Layout auf xl+ (TOC links, Body Mitte, Quellen rechts),
 * 2-Spalten auf lg, Mobile mit collapsible TOC oben.
 *
 * ISR 1 h — Artikel ändern sich nach Publish selten, aber Updates
 * (titleEmphasis, BatchInfoCard-Wechsel) sollen ohne Redeploy
 * sichtbar werden.
 */
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, seoTitle: true, seoDescription: true, coverImage: true, publishedAt: true },
  });
  if (!post || !post.publishedAt) return { title: "Artikel nicht gefunden" };

  const title = post.seoTitle ?? `${post.title} — ChromePeps Wissen`;
  const description = post.seoDescription ?? post.excerpt;
  return {
    title,
    description,
    alternates: { canonical: `/wissen/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      ...(post.coverImage ? { images: [{ url: post.coverImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}

export default async function WissenArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({
    where: { slug },
    include: { category: true, author: true },
  });
  if (!post || !post.publishedAt) notFound();

  // Verwandte Posts: gleiche Kategorie, ohne den aktuellen, max 3.
  const related = await db.blogPost.findMany({
    where: {
      categoryId: post.categoryId,
      slug: { not: slug },
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
    include: { category: true, author: true },
  });

  const toc = extractToc(post.contentMdx);
  const dateLabel = formatDate(post.publishedAt);
  const updatedLabel =
    post.updatedManually && post.updatedManually > post.publishedAt
      ? formatDate(post.updatedManually)
      : null;

  // titleEmphasis: ersetze den ersten Substring-Match im Title durch
  // <em>-Wrapper. Bei Mehrfach-Match nur das erste (vermeidet
  // ungewollte Italic-Sturzfluten bei generischen Wörtern).
  const titleParts = renderTitleWithEmphasis(
    post.title,
    post.titleEmphasis,
  );

  const articleSchema = articleJsonLd({
    title: post.title,
    excerpt: post.excerpt,
    slug: post.slug,
    authorName: post.author.name,
    authorTitle: post.author.title,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedManually ?? post.updatedAt,
    coverImage: post.coverImage,
  });

  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Wissen", path: "/wissen" },
    {
      name: post.category.name,
      path: `/wissen/kategorie/${post.category.slug}`,
    },
    { name: post.title, path: `/wissen/${post.slug}` },
  ]);

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <BlogPostViewTracker slug={post.slug} />

      {/* Header */}
      <header className="border-b border-border">
        <div className="container pt-10 pb-12 md:pt-14 md:pb-16">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mono-label text-muted-foreground flex items-center gap-2 flex-wrap"
            style={{ fontSize: 10.5 }}
          >
            <Link href="/wissen" className="hover:text-foreground">
              Wissen
            </Link>
            <ChevronRight size={11} />
            <Link
              href={`/wissen/kategorie/${post.category.slug}`}
              className="hover:text-foreground"
            >
              {post.category.name}
            </Link>
            <ChevronRight size={11} />
            <span className="text-foreground line-clamp-1">{post.title}</span>
          </nav>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <CategoryBadge color="gold">{post.category.name}</CategoryBadge>
          </div>

          <h1 className="mt-5 font-serif text-[40px] md:text-[60px] lg:text-[68px] leading-[1.04] tracking-[-0.02em] font-medium max-w-[22ch]">
            {titleParts}
          </h1>

          <p className="mt-7 text-[18px] md:text-[20px] leading-[1.55] text-foreground/85 max-w-[60ch]">
            {post.excerpt}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3">
            <span
              aria-hidden="true"
              className="shrink-0 inline-flex items-center justify-center font-mono text-[12px] font-semibold text-foreground"
              style={{
                width: 36,
                height: 36,
                borderRadius: "9999px",
                background: "hsl(20 14% 92%)",
                border: "1px solid hsl(var(--border))",
              }}
            >
              {initials(post.author.name)}
            </span>
            <span
              className="font-mono text-[12.5px] font-semibold"
              style={{ letterSpacing: "0.02em" }}
            >
              {post.author.name}
            </span>
            {post.author.title && (
              <>
                <span aria-hidden="true" className="opacity-40">
                  ·
                </span>
                <span
                  className="mono-label text-muted-foreground"
                  style={{ fontSize: 10.5 }}
                >
                  {post.author.title}
                </span>
              </>
            )}
            <span aria-hidden="true" className="opacity-40">
              ·
            </span>
            <MetaLine
              time={`${post.readingMinutes} min`}
              date={dateLabel}
              updated={updatedLabel ?? undefined}
            />
          </div>
        </div>

        {/* Cover */}
        <div className="container pb-10">
          {post.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full rounded-sm"
              style={{ aspectRatio: "21/9", objectFit: "cover" }}
            />
          ) : (
            <CoverPlaceholder
              variant="v3"
              dark
              glyph={inferGlyph(post.category.slug)}
              aspect="21/9"
              className="rounded-sm"
              label={post.title}
            />
          )}
        </div>
      </header>

      {/* Body — 2-col on lg, 3-col on xl */}
      <div className="container pt-12 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_220px] gap-10 lg:gap-14">
          {/* Sticky TOC (desktop) */}
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <TocList items={toc} />
              </div>
            </aside>
          )}

          {/* Mobile TOC accordion */}
          {toc.length > 0 && (
            <details className="lg:hidden border border-border rounded-sm bg-white">
              <summary
                className="cursor-pointer flex items-center justify-between px-4 py-3 mono-tag text-foreground"
                style={{ fontSize: 11 }}
              >
                <span>
                  Inhaltsverzeichnis · {toc.length} Abschnitt
                  {toc.length === 1 ? "" : "e"}
                </span>
                <ChevronDown size={14} />
              </summary>
              <div className="px-4 pb-4 pt-1">
                <TocList items={toc} />
              </div>
            </details>
          )}

          {/* Article body */}
          <div
            id="article-body"
            className="prose"
            style={{ maxWidth: "680px", margin: "0 auto" }}
          >
            <ArticleBody markdown={post.contentMdx} />

            {/* Optionale BatchInfoCard nach dem Body, wenn ein
                featured-Produkt-Slug am Post hinterlegt ist. */}
            {post.featuredBatchProductSlug && (
              <BatchInfoCard productSlug={post.featuredBatchProductSlug} />
            )}
          </div>

          {/* Right rail — verwandte Begriffe (Glossar). Quellen-Box ist
              redaktionell und in dieser Iteration nicht modelliert; bei
              Bedarf später als BlogPost.references String[] o.Ä. */}
          <aside className="hidden xl:block">
            <div className="sticky top-24">
              {post.relatedGlossarSlugs.length > 0 && (
                <>
                  <p
                    className="mono-tag text-muted-foreground mb-3"
                    style={{ fontSize: 10 }}
                  >
                    Verwandte Begriffe
                  </p>
                  <ul className="m-0 p-0 list-none flex flex-col gap-2">
                    {post.relatedGlossarSlugs.map((s) => (
                      <li key={s}>
                        <Link
                          href={`/wissen/glossar#${s}`}
                          className="font-mono text-[12px] text-foreground hover:text-primary"
                          style={{ letterSpacing: "0.02em" }}
                        >
                          → {s}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Author box */}
      {post.author.bio && (
        <section className="border-t border-border">
          <div className="container py-10 md:py-14">
            <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-6 max-w-[820px]">
              <div className="w-20 h-20 rounded-full bg-[hsl(20_14%_92%)] border border-border inline-flex items-center justify-center font-mono text-[18px] font-semibold">
                {initials(post.author.name)}
              </div>
              <div>
                <p className="mono-tag text-muted-foreground">Autor</p>
                <h3 className="mt-1 font-serif text-[24px] tracking-tight font-medium">
                  {post.author.name}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-foreground/85 max-w-[60ch]">
                  {post.author.bio}
                </p>
                {post.author.orcid && (
                  <p
                    className="mt-3 font-mono text-[11px] text-muted-foreground"
                    style={{ letterSpacing: "0.04em" }}
                  >
                    ORCID {post.author.orcid}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border">
          <div className="container py-14 md:py-20">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="font-serif text-[26px] md:text-[30px] tracking-tight font-medium">
                Weiterlesen
              </h2>
              <span className="mono-tag text-muted-foreground">
                {related.length} verwandte Artikel
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">
              {related.map((p) => (
                <ArticleCard
                  key={p.slug}
                  article={toCardData(p)}
                  variant="grid"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {post.featuredBatchProductSlug && (
        <section className="border-t border-border bg-[hsl(40_20%_96%)]">
          <div className="container py-10 md:py-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="mono-tag text-primary">
                  Lieferbar · Charge online verifizierbar
                </span>
                <p className="mt-2 font-serif text-[22px] md:text-[24px] tracking-tight font-medium">
                  Diese Charge ist lieferbar.{" "}
                  <span className="text-muted-foreground italic">
                    CoA per Mail zu jeder Bestellung.
                  </span>
                </p>
              </div>
              <Link
                href={`/products/${post.featuredBatchProductSlug}`}
                className="btn-ink inline-flex items-center gap-2 self-start md:self-auto"
              >
                Zum Produkt <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function inferGlyph(
  categorySlug: string,
):
  | "hplc"
  | "chain"
  | "drop"
  | "grid"
  | "flask"
  | "beaker"
  | "book"
  | "clipboard" {
  switch (categorySlug) {
    case "methodik":
      return "hplc";
    case "wirkstoffklassen":
      return "chain";
    case "lab-practice":
      return "drop";
    case "regulatorisches":
      return "clipboard";
    case "forschung":
      return "book";
    default:
      return "flask";
  }
}

function renderTitleWithEmphasis(
  title: string,
  emphasis: string | null,
): React.ReactNode {
  if (!emphasis) return title;
  const idx = title.indexOf(emphasis);
  if (idx === -1) return title;
  return (
    <>
      {title.slice(0, idx)}
      <em className="font-serif italic font-normal">{emphasis}</em>
      {title.slice(idx + emphasis.length)}
    </>
  );
}

type PostWithCategoryAndAuthor = Awaited<
  ReturnType<typeof db.blogPost.findFirst>
> & {
  category: { name: string; slug: string };
  author: { name: string };
};

function toCardData(
  post: NonNullable<PostWithCategoryAndAuthor>,
): ArticleCardData {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    authorName: post.author.name,
    readingMinutes: post.readingMinutes,
    publishedAt: post.publishedAt!,
    category: { name: post.category.name, slug: post.category.slug },
  };
}
