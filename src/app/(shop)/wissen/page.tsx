import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { db } from "@/lib/db";
import { ArticleCard, type ArticleCardData } from "@/components/wissen/article-card";
import { NewsletterBlock } from "@/components/wissen/newsletter-block";

/**
 * /wissen — Wissens-Hub.
 *
 * Server Component. Lädt parallel:
 *  - Featured: latest published BlogPost
 *  - Recent 6 weitere
 *  - 5 BlogCategories mit Post-Counts
 *
 * `force-dynamic`: zur Build-Zeit existiert keine DATABASE_URL (siehe
 * homepage-Pattern in src/app/(shop)/page.tsx) — ein ISR-Prerender
 * würde mit Prisma-Init-Error scheitern. Hub-Daten sollen außerdem
 * frisch sein wenn neue Posts publiziert werden.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wissen — Forschung verstehen",
  description:
    "Methodik, Wirkstoffklassen, Lab Practice. Lesematerial für Forscher, Lab-Manager und Studierende — geschrieben in der Sprache, die in der Auswertung gebraucht wird.",
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

  const allCount = (featured ? 1 : 0) + recent.length;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 apo-grid opacity-100"
          aria-hidden="true"
        />
        <div className="container relative py-20 md:py-28">
          <span className="mono-tag text-primary">
            Wissensbereich · /wissen
          </span>
          <h1 className="mt-5 font-serif text-[44px] md:text-[64px] lg:text-[72px] leading-[1.02] tracking-[-0.02em] font-medium max-w-[16ch]">
            Forschung{" "}
            <em className="font-serif italic">verstehen</em>.
          </h1>
          <p className="mt-6 text-[17px] md:text-[19px] text-muted-foreground leading-relaxed max-w-[58ch]">
            Methodik, Wirkstoffklassen, Lab Practice. Lesematerial für
            Forscher, Lab-Manager und Studierende — geschrieben in der
            Sprache, die in der Auswertung gebraucht wird, nicht im
            Marketing-Deck.
          </p>

          {/* Search-Stub — wird in eigener Iteration mit /api/search verdrahtet. */}
          <form
            method="get"
            action="/wissen"
            className="mt-9 max-w-[640px] relative"
          >
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            {/* TODO(salih): wire to /api/search when shipped. */}
            <input
              type="search"
              name="q"
              placeholder='Begriff, Substanz oder Methode suchen — z. B. „Tirzepatid HPLC"'
              className="input-search"
              aria-label="Im Wissensbereich suchen"
            />
          </form>

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

      {/* Featured */}
      {featured && (
        <section className="container py-14 md:py-20">
          <div className="flex items-baseline justify-between mb-7">
            <h2 className="font-serif text-[28px] md:text-[32px] tracking-tight font-medium">
              Im Fokus
            </h2>
            <span className="mono-tag text-muted-foreground">Diese Woche</span>
          </div>
          <ArticleCard
            article={toCardData(featured)}
            variant="featured"
          />
        </section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <section className="container pb-16 md:pb-20">
          <div className="flex items-baseline justify-between mb-7">
            <h2 className="font-serif text-[28px] md:text-[32px] tracking-tight font-medium">
              Aktuell
            </h2>
            {/* "Alle ansehen" verweist aktuell auf den Hub selbst — eigene
                Listing-Seite wäre Iter 2. */}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">
            {recent.map((post) => (
              <ArticleCard
                key={post.slug}
                article={toCardData(post)}
                variant="grid"
              />
            ))}
          </div>
        </section>
      )}

      {/* Pillar topics — Kategorien als minimalistische Cards */}
      {categories.length > 0 && (
        <section className="border-t border-border">
          <div className="container py-16 md:py-20">
            <div className="flex items-baseline justify-between mb-9">
              <div>
                <span className="mono-tag text-muted-foreground">Themen</span>
                <h2 className="mt-2 font-serif text-[28px] md:text-[32px] tracking-tight font-medium">
                  Pillar-Themen
                </h2>
              </div>
              <p className="hidden md:block text-[14px] text-muted-foreground max-w-[36ch] text-right">
                Schwerpunkte mit redaktioneller Tiefe — Einstieg in die
                wichtigsten Forschungsbereiche.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((c, i) => (
                <Link
                  key={c.slug}
                  href={`/wissen/kategorie/${c.slug}`}
                  className="group block p-6 border border-border rounded-sm bg-white hover:border-foreground transition-colors"
                >
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
                    className="mt-5 inline-flex items-center gap-1.5 mono-label text-foreground group-hover:text-primary transition-colors"
                    style={{ fontSize: 10 }}
                  >
                    Eintauchen <ArrowRight size={12} />
                  </span>
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
