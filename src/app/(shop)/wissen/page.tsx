import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { ArticleCard, type ArticleCardData } from "@/components/wissen/article-card";
import { NewsletterBlock } from "@/components/wissen/newsletter-block";
import { WissenSearchBox } from "@/components/wissen/search-box";

/**
 * /wissen — Wissens-Hub im Journal-Schnitt.
 *
 * Server Component. Lädt parallel:
 *  - Featured: latest published BlogPost
 *  - Recent 6 weitere
 *  - 5 BlogCategories mit Post-Counts
 *
 * Aufbau: Masthead (Titel + Suche + Kategorie-Pills + Mono-Readout),
 * Leitartikel als asymmetrisches Lead-Stück, Artikel-Index als
 * nummerierte Zeilen-Liste, Pillar-Themen, Newsletter-Protokoll.
 *
 * `force-dynamic`: zur Build-Zeit existiert keine DATABASE_URL (siehe
 * homepage-Pattern in src/app/(shop)/page.tsx) — ein ISR-Prerender
 * würde mit Prisma-Init-Error scheitern. Hub-Daten sollen außerdem
 * frisch sein wenn neue Posts publiziert werden.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wissen: Forschung verstehen",
  description:
    "Methodik, Wirkstoffklassen, Lab Practice. Lesematerial für Forscher, Lab-Manager und Studierende, geschrieben in der Sprache, die in der Auswertung gebraucht wird.",
  alternates: {
    canonical: "/wissen",
  },
};

export default async function WissenHubPage() {
  const [featured, recent, categories] = await Promise.all([
    db.blogPost.findFirst({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      include: { category: true, author: true },
    }),
    db.blogPost.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      skip: 1,
      take: 6,
      include: { category: true, author: true },
    }),
    db.blogCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { posts: { where: { publishedAt: { not: null } } } } } },
    }),
  ]);

  // Echte Gesamtzahl aller veröffentlichten Posts = Summe der Kategorie-
  // Counts (categoryId ist im Schema Pflichtfeld, jeder Post hat genau
  // eine Kategorie). Vorher wurde nur Featured+Recent gezählt — der
  // "Alle"-Count war damit auf max. 7 gedeckelt.
  const allCount = categories.reduce((sum, c) => sum + c._count.posts, 0);

  return (
    <div className="flex flex-col">
      {/* Masthead */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 apo-grid-light"
          aria-hidden="true"
        />
        <div className="container relative py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-x-16 gap-y-10 items-end">
            <div>
              <span className="eyebrow">Wissensbereich · /wissen</span>
              <h1 className="mt-5 display-title text-[44px] md:text-[64px] lg:text-[72px] max-w-[16ch]">
                Forschung <em>verstehen</em>.
              </h1>
              <p className="mt-6 text-[17px] md:text-[19px] text-muted-foreground leading-relaxed max-w-[58ch]">
                Methodik, Wirkstoffklassen, Lab Practice. Lesematerial für
                Forscher, Lab-Manager und Studierende, geschrieben in der
                Sprache, die in der Auswertung gebraucht wird, nicht im
                Marketing-Deck.
              </p>
            </div>

            {/* Mono-Readout: Bestandszahlen wie ein Instrumenten-Display. */}
            <dl className="flex lg:flex-col gap-x-10 gap-y-6 lg:text-right lg:pb-2">
              <div>
                <dt className="stat-key">Artikel</dt>
                <dd className="stat-value mt-1.5 text-3xl md:text-4xl">
                  {String(allCount).padStart(2, "0")}
                </dd>
              </div>
              <div>
                <dt className="stat-key">Rubriken</dt>
                <dd className="stat-value mt-1.5 text-3xl md:text-4xl">
                  {String(categories.length).padStart(2, "0")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Live-Search: WissenSearchBox (client) callt
              /api/wissen/search mit Debounce 300ms. */}
          <div className="mt-10">
            <WissenSearchBox />
          </div>

          {/* Kategorie-Pills */}
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href="/wissen" className="pill active">
              Alle <span className="count">[{String(allCount).padStart(2, "0")}]</span>
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/wissen/kategorie/${c.slug}`}
                className="pill"
              >
                {c.name}{" "}
                <span className="count">
                  [{String(c._count.posts).padStart(2, "0")}]
                </span>
              </Link>
            ))}
            <Link href="/wissen/glossar" className="pill">
              Glossar <span className="count">A–Z</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Leitartikel */}
      {featured && (
        <section className="container py-14 md:py-20">
          <SectionHead
            no="01"
            title="Im Fokus"
            aside="Diese Woche"
          />
          <ArticleCard
            article={toCardData(featured)}
            variant="featured"
          />
        </section>
      )}

      {/* Index — Zeilen-Liste mit Mono-Ordnungszahlen */}
      {recent.length > 0 && (
        <section className="container pb-16 md:pb-20">
          <SectionHead
            no="02"
            title="Index"
            aside={`${recent.length} weitere Beiträge`}
          />
          <div>
            {recent.map((post, i) => (
              <ArticleCard
                key={post.slug}
                article={toCardData(post)}
                variant="list"
                index={i + 2}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pillar topics — Kategorien als Protokoll-Karten */}
      {categories.length > 0 && (
        <section className="border-t border-border">
          <div className="container py-16 md:py-20">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-6 items-end mb-4">
              <div>
                <span className="eyebrow">Themen</span>
                <h2 className="mt-3 display-title text-[28px] md:text-[34px]">
                  Pillar-Themen
                </h2>
              </div>
              <p className="hidden md:block text-[14px] text-muted-foreground max-w-[36ch] md:text-right">
                Schwerpunkte mit redaktioneller Tiefe; Einstieg in die
                wichtigsten Forschungsbereiche.
              </p>
            </div>
            <div className="tick-rule mb-9" aria-hidden="true" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((c, i) => (
                <Link
                  key={c.slug}
                  href={`/wissen/kategorie/${c.slug}`}
                  className="group relative block p-6 border border-border rounded-sm bg-card hover:border-foreground transition-colors overflow-hidden"
                >
                  <span
                    aria-hidden="true"
                    className="index-ghost absolute -top-3 right-3 text-[88px]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="relative">
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className="mono-tag text-muted-foreground"
                        style={{ fontSize: 9 }}
                      >
                        {String(i + 1).padStart(2, "0")} /{" "}
                        {String(categories.length).padStart(2, "0")}
                      </span>
                      <span
                        className="font-mono text-[11px] text-muted-foreground"
                        style={{ letterSpacing: "0.06em" }}
                      >
                        {c._count.posts}{" "}
                        {c._count.posts === 1 ? "Artikel" : "Artikel"}
                      </span>
                    </div>
                    <h3 className="mt-5 font-serif text-[26px] tracking-tight font-medium leading-tight">
                      <span className="gold-underline">{c.name}</span>
                    </h3>
                    {c.description && (
                      <p
                        className="mt-2 font-mono text-[11px] text-muted-foreground"
                        style={{ letterSpacing: "0.04em" }}
                      >
                        {c.description}
                      </p>
                    )}
                    <span
                      className="mt-5 inline-flex items-center gap-1.5 mono-label text-foreground group-hover:text-primary-strong transition-colors"
                      style={{ fontSize: 10 }}
                    >
                      Eintauchen <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="container py-16 md:py-20">
        <NewsletterBlock />
      </section>
    </div>
  );
}

/**
 * Sektionskopf im Protokoll-Stil: Mono-Ordnungszahl, Fraunces-Titel,
 * rechtsbündige Mono-Notiz, darunter ein Mess-Lineal.
 */
function SectionHead({
  no,
  title,
  aside,
}: {
  no: string;
  title: string;
  aside?: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 className="flex items-baseline gap-4 display-title text-[28px] md:text-[32px]">
          <span
            aria-hidden="true"
            className="font-mono text-[11px] font-semibold text-primary-strong"
            style={{ letterSpacing: "0.16em" }}
          >
            {no}
          </span>
          {title}
        </h2>
        {aside && (
          <span className="mono-tag text-muted-foreground">{aside}</span>
        )}
      </div>
      <div className="tick-rule" aria-hidden="true" />
    </div>
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
