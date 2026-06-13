import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { CategoryBadge } from "./category-badge";
import { MetaLine } from "./meta-line";
import { CoverPlaceholder } from "./cover-placeholder";

/**
 * ArticleCard in drei Varianten:
 *  - grid (default): Karte im Hub-/Related-Grid — Cover, Haarlinie,
 *    Mono-Metadaten (Kategorie / Lesezeit), Fraunces-Titel
 *  - list: redaktioneller Zeilen-Eintrag (Kategorie-Listen, Hub-Index)
 *    mit optionaler Mono-Ordnungszahl links und Cover-Thumbnail rechts
 *  - featured: großes asymmetrisches Lead-Stück auf Ink (Hub) — Text
 *    links (5/12), Cover rechts (7/12), Protokoll-Fußzeile mit Ticks
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
  /** Laufende Nummer für die list-Variante (Mono-Index, 1-basiert). */
  index?: number;
}

export function ArticleCard({ article, variant = "grid", index }: Props) {
  const href = `/wissen/${article.slug}`;
  const dateLabel = formatDate(article.publishedAt);
  const timeLabel = `${article.readingMinutes} min`;

  if (variant === "list") {
    return (
      <Link
        href={href}
        className="article-card group flex gap-5 md:gap-7 py-7 items-start border-b border-border"
      >
        {typeof index === "number" && (
          <span
            aria-hidden="true"
            className="hidden sm:block shrink-0 font-mono text-[12px] font-medium text-muted-foreground tabular-nums pt-1.5 w-7"
            style={{ letterSpacing: "0.04em" }}
          >
            {String(index).padStart(2, "0")}
          </span>
        )}
        <div className="flex-1 min-w-0" style={{ paddingTop: 2 }}>
          <div className="flex items-baseline gap-3 flex-wrap mb-2.5">
            <span className="mono-tag text-primary-strong" style={{ fontSize: 10 }}>
              {article.category.name}
            </span>
            <span
              className="font-mono text-[10px] text-muted-foreground"
              style={{ letterSpacing: "0.08em" }}
            >
              {timeLabel}
            </span>
          </div>
          <h3 className="font-serif text-[24px] md:text-[26px] leading-[1.18] tracking-tight font-medium">
            <span className="gold-underline">{article.title}</span>
          </h3>
          <p className="mt-2 text-[14.5px] text-muted-foreground line-clamp-2 leading-relaxed max-w-[64ch]">
            {article.excerpt}
          </p>
          <div className="mt-3">
            <MetaLine author={article.authorName} date={dateLabel} />
          </div>
        </div>
        <div className="hidden sm:block shrink-0 w-[116px] md:w-[132px]">
          <CoverFor article={article} aspect="1/1" />
        </div>
      </Link>
    );
  }

  if (variant === "featured") {
    return (
      <Link
        href={href}
        className="article-card group section-ink rounded-sm border border-ink-border block overflow-hidden transition-colors hover:border-primary/50"
      >
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Asymmetrie: Text 5/12 links, Cover 7/12 rechts. */}
          <div className="md:col-span-5 md:order-1 p-7 md:p-10 flex flex-col">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <span className="mono-tag text-primary" style={{ letterSpacing: "0.2em" }}>
                Leitartikel
              </span>
              <CategoryBadge color="ink">{article.category.name}</CategoryBadge>
            </div>
            <h2 className="mt-6 display-title text-[32px] md:text-[38px] lg:text-[42px] text-ink-foreground">
              <span className="gold-underline">{article.title}</span>
            </h2>
            <p className="mt-4 text-[15px] md:text-[15.5px] text-ink-muted leading-relaxed max-w-[52ch]">
              {article.excerpt}
            </p>
            <div className="mt-auto pt-8">
              <div className="tick-rule mb-4" aria-hidden="true" />
              <div className="flex flex-wrap items-center justify-between gap-4">
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
          <div className="md:col-span-7 md:order-2 relative border-b md:border-b-0 md:border-l border-ink-border order-first">
            <CoverFor article={article} aspect="16/10" forceDark />
          </div>
        </div>
      </Link>
    );
  }

  // grid (default)
  return (
    <Link href={href} className="article-card group block">
      <CoverFor article={article} aspect="16/10" />
      <div className="mt-4 border-t border-foreground/80 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="mono-tag text-primary-strong" style={{ fontSize: 10 }}>
            {article.category.name}
          </span>
          <span
            className="font-mono text-[10px] text-muted-foreground"
            style={{ letterSpacing: "0.08em" }}
          >
            {timeLabel}
          </span>
        </div>
        <h3 className="mt-3 font-serif text-[22px] leading-[1.2] tracking-tight font-medium line-clamp-2">
          <span className="gold-underline">{article.title}</span>
        </h3>
        <p className="mt-2 text-[14.5px] text-muted-foreground line-clamp-2 leading-relaxed">
          {article.excerpt}
        </p>
        <div className="mt-3">
          <MetaLine author={article.authorName} date={dateLabel} />
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
