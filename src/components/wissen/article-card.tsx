import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { CategoryBadge } from "./category-badge";
import { MetaLine } from "./meta-line";
import { CoverPlaceholder } from "./cover-placeholder";

/**
 * ArticleCard in drei Varianten:
 *  - grid (default): Card im 3-Spalten-Hub-Grid
 *  - list: Magazinstil-Eintrag mit Cover-Thumbnail links + Body rechts
 *          (Kategorie-Listen)
 *  - featured: große Ink-Card mit Cover-Image, "Featured"-Badge,
 *              Outline-Kategorie und Weiterlesen-CTA (Hub-Hero)
 *
 * Pure server component — kein Client-State.
 */

export interface ArticleCardData {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  authorName: string;
  readingMinutes: number;
  publishedAt: Date;
  category: { name: string; slug: string };
  // Optionaler Glyph-Hint für CoverPlaceholder, wenn coverImage null ist.
  coverGlyph?: "hplc" | "chain" | "drop" | "grid" | "flask" | "beaker" | "book" | "clipboard";
  coverVariant?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6";
}

interface Props {
  article: ArticleCardData;
  variant?: "grid" | "list" | "featured";
}

export function ArticleCard({ article, variant = "grid" }: Props) {
  const href = `/wissen/${article.slug}`;
  const dateLabel = formatDate(article.publishedAt);
  const timeLabel = `${article.readingMinutes} min`;

  if (variant === "list") {
    return (
      <Link
        href={href}
        className="article-card group flex gap-6 py-7 items-start border-b border-border"
      >
        <div className="shrink-0">
          <CoverFor article={article} aspect="1/1" />
        </div>
        <div className="flex-1 min-w-0" style={{ paddingTop: 2 }}>
          <div
            className="mono-label text-muted-foreground mb-2"
            style={{ fontSize: 10 }}
          >
            <span className="text-primary">{article.category.name}</span>
          </div>
          <h3 className="font-serif text-[24px] md:text-[26px] leading-[1.18] tracking-tight font-medium">
            <span className="gold-underline">{article.title}</span>
          </h3>
          <p className="mt-2 text-[14.5px] text-muted-foreground line-clamp-2 leading-relaxed max-w-[64ch]">
            {article.excerpt}
          </p>
          <div className="mt-3">
            <MetaLine
              author={article.authorName}
              time={timeLabel}
              date={dateLabel}
            />
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "featured") {
    return (
      <Link
        href={href}
        className="group section-ink rounded-sm border border-ink-border block overflow-hidden transition-colors hover:border-primary/50"
      >
        <div className="grid grid-cols-1 md:grid-cols-5">
          <div className="md:col-span-2 relative">
            <CoverFor article={article} aspect="4/3" forceDark />
            <div
              className="absolute top-4 left-4 mono-tag bg-primary text-ink px-2.5 py-1 rounded-sm"
              style={{ letterSpacing: "0.18em" }}
            >
              Featured
            </div>
          </div>
          <div className="md:col-span-3 p-7 md:p-10 flex flex-col">
            <CategoryBadge color="ink">{article.category.name}</CategoryBadge>
            <h2 className="mt-5 font-serif text-[34px] md:text-[40px] leading-[1.08] tracking-tight font-medium text-ink-foreground">
              <span className="gold-underline">{article.title}</span>
            </h2>
            <p className="mt-4 text-[15.5px] md:text-[16px] text-ink-muted leading-relaxed max-w-[58ch]">
              {article.excerpt}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <MetaLine
                author={article.authorName}
                time={timeLabel}
                date={dateLabel}
                dark
              />
              <span className="btn-ink inline-flex items-center gap-2">
                Weiterlesen <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // grid (default)
  return (
    <Link href={href} className="article-card group block">
      <CoverFor article={article} aspect="16/10" />
      <div className="pt-4">
        <CategoryBadge>{article.category.name}</CategoryBadge>
        <h3 className="mt-3 font-serif text-[22px] leading-[1.2] tracking-tight font-medium line-clamp-2">
          <span className="gold-underline">{article.title}</span>
        </h3>
        <p className="mt-2 text-[14.5px] text-muted-foreground line-clamp-2 leading-relaxed">
          {article.excerpt}
        </p>
        <div className="mt-3">
          <MetaLine
            author={article.authorName}
            time={timeLabel}
            date={dateLabel}
          />
        </div>
      </div>
    </Link>
  );
}

function CoverFor({
  article,
  aspect,
  forceDark = false,
}: {
  article: ArticleCardData;
  aspect: string;
  forceDark?: boolean;
}) {
  if (article.coverImage) {
    // Echtes Cover-Image (sobald hinterlegt). Fixe-Höhen-Container damit
    // das aspect-ratio greift.
    return (
      <div
        className="relative overflow-hidden rounded-sm bg-muted"
        style={{ aspectRatio: aspect }}
      >
        <Image
          src={article.coverImage}
          alt={article.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 22vw"
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <CoverPlaceholder
      aspect={aspect}
      glyph={article.coverGlyph ?? "flask"}
      variant={article.coverVariant ?? "v1"}
      dark={forceDark}
      label={article.title}
      className="rounded-sm"
    />
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
