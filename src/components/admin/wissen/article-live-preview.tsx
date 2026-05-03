"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, ChevronRight, ExternalLink } from "lucide-react";
import { ArticleBody } from "@/components/wissen/article-body";
import { CategoryBadge } from "@/components/wissen/category-badge";
import { CoverPlaceholder } from "@/components/wissen/cover-placeholder";
import { MetaLine } from "@/components/wissen/meta-line";
import { TocList } from "@/components/wissen/toc-list";
import { extractToc } from "@/lib/wissen/extract-toc";

/**
 * Live-Preview einer BlogPost-Detailseite. Replicates 1:1 das Layout
 * von src/app/(shop)/wissen/[slug]/page.tsx — gleiche CSS-Klassen,
 * gleiche Komponenten, gleiche .prose-Body-Renderung — damit der
 * Editor-User exakt sieht was später live geht.
 *
 * Zwei Abweichungen vs. Live-Page:
 *  1. BatchInfoCard kann hier nicht gerendert werden (db-Query
 *     server-only). Stattdessen ein Skeleton-Placeholder mit Hinweis,
 *     wenn featuredBatchProductSlug gesetzt ist.
 *  2. Verwandte Posts + CTA-Sektion am Ende sind weggelassen — die
 *     hängen vom Live-DB-State ab und sind im Editor nicht sinnvoll.
 *
 * Author-Info kommt aus dem aktuellen Form-State (per Author-Dropdown
 * vorausgewählt) und wird live geupdated.
 */

export interface PreviewAuthorData {
  name: string;
  title?: string | null;
  bio?: string | null;
  orcid?: string | null;
}

export interface PreviewCategoryData {
  name: string;
  slug: string;
}

export interface ArticleLivePreviewProps {
  title: string;
  titleEmphasis: string | null;
  excerpt: string;
  contentMdx: string;
  coverImage: string | null;
  readingMinutes: number;
  publishedAt: Date | null;
  updatedManually: Date | null;
  featuredBatchProductSlug: string | null;
  relatedGlossarSlugs: string[];
  category: PreviewCategoryData | null;
  author: PreviewAuthorData | null;
}

export function ArticleLivePreview(props: ArticleLivePreviewProps) {
  const {
    title,
    titleEmphasis,
    excerpt,
    contentMdx,
    coverImage,
    readingMinutes,
    publishedAt,
    updatedManually,
    featuredBatchProductSlug,
    relatedGlossarSlugs,
    category,
    author,
  } = props;

  const toc = useMemo(() => extractToc(contentMdx), [contentMdx]);
  const dateLabel = publishedAt
    ? formatDate(publishedAt)
    : "(noch nicht veröffentlicht)";
  const updatedLabel =
    updatedManually && publishedAt && updatedManually > publishedAt
      ? formatDate(updatedManually)
      : null;
  const titleParts = renderTitleWithEmphasis(title, titleEmphasis);
  const authorName = author?.name ?? "Autor wählen…";

  return (
    <article className="bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container pt-10 pb-12 md:pt-14 md:pb-16">
          <nav
            aria-label="Breadcrumb"
            className="mono-label text-muted-foreground flex items-center gap-2 flex-wrap"
            style={{ fontSize: 10.5 }}
          >
            <span className="hover:text-foreground">Wissen</span>
            <ChevronRight size={11} />
            <span className="hover:text-foreground">
              {category?.name ?? "(Kategorie wählen)"}
            </span>
            <ChevronRight size={11} />
            <span className="text-foreground line-clamp-1">
              {title || "(Titel)"}
            </span>
          </nav>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <CategoryBadge color="gold">
              {category?.name ?? "Kategorie"}
            </CategoryBadge>
          </div>

          <h1 className="mt-5 font-serif text-[40px] md:text-[60px] lg:text-[68px] leading-[1.04] tracking-[-0.02em] font-medium max-w-[22ch]">
            {title ? titleParts : <span className="opacity-30">(Titel)</span>}
          </h1>

          <p className="mt-7 text-[18px] md:text-[20px] leading-[1.55] text-foreground/85 max-w-[60ch]">
            {excerpt || (
              <span className="opacity-30">(Excerpt — kurze Beschreibung)</span>
            )}
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
              {initials(authorName)}
            </span>
            <span
              className="font-mono text-[12.5px] font-semibold"
              style={{ letterSpacing: "0.02em" }}
            >
              {authorName}
            </span>
            {author?.title && (
              <>
                <span aria-hidden="true" className="opacity-40">
                  ·
                </span>
                <span
                  className="mono-label text-muted-foreground"
                  style={{ fontSize: 10.5 }}
                >
                  {author.title}
                </span>
              </>
            )}
            <span aria-hidden="true" className="opacity-40">
              ·
            </span>
            <MetaLine
              time={`${readingMinutes} min`}
              date={dateLabel}
              updated={updatedLabel ?? undefined}
            />
          </div>
        </div>

        {/* Cover */}
        <div className="container pb-10">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={title}
              className="w-full rounded-sm"
              style={{ aspectRatio: "21/9", objectFit: "cover" }}
            />
          ) : (
            <CoverPlaceholder
              variant="v3"
              dark
              glyph={inferGlyph(category?.slug ?? "")}
              aspect="21/9"
              className="rounded-sm"
              label={title}
            />
          )}
        </div>
      </header>

      {/* Body */}
      <div className="container pt-12 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)] gap-10 lg:gap-14">
          {toc.length > 0 ? (
            <aside className="hidden lg:block">
              <div className="sticky top-4">
                <TocList items={toc} />
              </div>
            </aside>
          ) : (
            <aside className="hidden lg:block">
              <p
                className="mono-tag text-muted-foreground/50"
                style={{ fontSize: 10 }}
              >
                Inhaltsverzeichnis
              </p>
              <p className="mt-3 text-[12px] text-muted-foreground italic">
                Erscheint sobald du H2/H3-Überschriften im Body anlegst.
              </p>
            </aside>
          )}

          <div
            id="article-body"
            className="prose"
            style={{ maxWidth: "680px", margin: "0 auto" }}
          >
            {contentMdx ? (
              <ArticleBody markdown={contentMdx} />
            ) : (
              <p className="text-muted-foreground italic">
                (Body — schreibe links in Markdown, hier siehst du das
                Ergebnis.)
              </p>
            )}

            {featuredBatchProductSlug && (
              <aside className="my-8 not-prose section-ink rounded-sm border border-ink-border p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="mono-tag text-primary">Aktuelle Charge</span>
                  <span
                    className="mono-label text-ink-muted"
                    style={{ fontSize: 10 }}
                  >
                    Live-Preview
                  </span>
                </div>
                <p className="font-serif text-[18px] leading-tight text-ink-foreground">
                  BatchInfoCard für{" "}
                  <code className="font-mono text-[14px] text-primary">
                    {featuredBatchProductSlug}
                  </code>
                </p>
                <p
                  className="mt-3 text-[12.5px] text-ink-muted leading-relaxed"
                  style={{ letterSpacing: "0.02em" }}
                >
                  Diese Karte zeigt Live die neueste publizierte COA des
                  Produkts. Sie ist im Editor nur als Platzhalter
                  sichtbar — auf der Live-Seite siehst du Lot, Reinheit,
                  Datum, Methode und Labor.
                </p>
                <div className="mt-5">
                  <span className="btn-ink inline-flex items-center gap-2">
                    Zum Produkt <ArrowRight size={12} />
                  </span>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* Author box */}
      {author?.bio && (
        <section className="border-t border-border">
          <div className="container py-10 md:py-14">
            <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-6 max-w-[820px]">
              <div className="w-20 h-20 rounded-full bg-[hsl(20_14%_92%)] border border-border inline-flex items-center justify-center font-mono text-[18px] font-semibold">
                {initials(author.name)}
              </div>
              <div>
                <p className="mono-tag text-muted-foreground">Autor</p>
                <h3 className="mt-1 font-serif text-[24px] tracking-tight font-medium">
                  {author.name}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-foreground/85 max-w-[60ch]">
                  {author.bio}
                </p>
                {author.orcid && (
                  <p
                    className="mt-3 font-mono text-[11px] text-muted-foreground"
                    style={{ letterSpacing: "0.04em" }}
                  >
                    ORCID {author.orcid}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Related-Glossar (rechte Spalte simuliert) */}
      {relatedGlossarSlugs.length > 0 && (
        <section className="border-t border-border bg-muted/20">
          <div className="container py-8">
            <p
              className="mono-tag text-muted-foreground mb-3"
              style={{ fontSize: 10 }}
            >
              Verwandte Begriffe (rechte Sticky-Spalte auf XL+)
            </p>
            <ul className="m-0 p-0 list-none flex flex-wrap gap-x-6 gap-y-2">
              {relatedGlossarSlugs.map((s) => (
                <li key={s}>
                  <Link
                    href={`/wissen/glossar#${s}`}
                    target="_blank"
                    className="font-mono text-[12px] text-foreground hover:text-primary inline-flex items-center gap-1"
                    style={{ letterSpacing: "0.02em" }}
                  >
                    → {s}{" "}
                    <ExternalLink className="h-3 w-3 opacity-40" />
                  </Link>
                </li>
              ))}
            </ul>
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
