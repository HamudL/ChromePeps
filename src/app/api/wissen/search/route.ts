import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";

/**
 * GET /api/wissen/search?q=...
 *
 * Public Full-Text-Search über BlogPost.title+excerpt + GlossarTerm.term+
 * acronym+shortDef + FAQItem.question+answer. Nutzt PostgreSQL
 * `to_tsvector('german', ...)` mit `plainto_tsquery` für robustes
 * Multi-Wort-Matching (Stemming, Ignorier-Words). Indices: GIN auf den
 * jeweiligen Tabellen (siehe Migration 20260504130000).
 *
 * Response-Shape:
 *  { success, data: { posts[3], glossar[3], faq[3] } }
 *  Pro Resource bis zu 3 Treffer — bewusst klein gehalten weil das
 *  ein Live-Search-Dropdown füllt, nicht eine Result-Page.
 *
 * Rate-Limit: 30/min/IP. Public-Endpoint, gleicher Schutz wie /api/products.
 *
 * Empty-/Short-Query: returnt leere Listen ohne DB-Hit (Debounce-Schutz).
 *
 * AUDIT_REPORT_v3 §3.3.
 */

const RESULTS_PER_RESOURCE = 5;

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const limit = await rateLimit(`wissen:search:${ip}`, {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({
      success: true,
      data: { posts: [], glossar: [], faq: [] },
    });
  }

  // plainto_tsquery escaped User-Input automatisch — kein SQL-Injection
  // Risiko trotz $queryRaw. Schreibung als Tagged-Template für Prisma's
  // Parameter-Binding.
  type PostHit = {
    slug: string;
    title: string;
    excerpt: string;
    category_slug: string;
    category_name: string;
  };
  type GlossarHit = {
    slug: string;
    term: string;
    acronym: string | null;
    short_def: string;
  };
  type FaqHit = {
    id: string;
    question: string;
    answer: string;
    category_name: string;
  };

  const [posts, glossar, faq] = await Promise.all([
    db.$queryRaw<PostHit[]>`
      SELECT bp.slug, bp.title, bp.excerpt,
             c.slug AS category_slug, c.name AS category_name
      FROM blog_posts bp
      JOIN blog_categories c ON c.id = bp."categoryId"
      WHERE bp."publishedAt" IS NOT NULL
        AND to_tsvector('german', coalesce(bp.title, '') || ' ' || coalesce(bp.excerpt, ''))
            @@ plainto_tsquery('german', ${q})
      ORDER BY ts_rank(
        to_tsvector('german', coalesce(bp.title, '') || ' ' || coalesce(bp.excerpt, '')),
        plainto_tsquery('german', ${q})
      ) DESC
      LIMIT ${RESULTS_PER_RESOURCE}
    `,
    db.$queryRaw<GlossarHit[]>`
      SELECT slug, term, acronym, "shortDef" AS short_def
      FROM glossar_terms
      WHERE to_tsvector('german', coalesce(term, '') || ' ' || coalesce(acronym, '') || ' ' || coalesce("shortDef", ''))
            @@ plainto_tsquery('german', ${q})
      ORDER BY ts_rank(
        to_tsvector('german', coalesce(term, '') || ' ' || coalesce(acronym, '') || ' ' || coalesce("shortDef", '')),
        plainto_tsquery('german', ${q})
      ) DESC
      LIMIT ${RESULTS_PER_RESOURCE}
    `,
    db.$queryRaw<FaqHit[]>`
      SELECT fi.id, fi.question, fi.answer, fc.name AS category_name
      FROM faq_items fi
      JOIN faq_categories fc ON fc.id = fi."categoryId"
      WHERE fi."isPublished" = true
        AND to_tsvector('german', coalesce(fi.question, '') || ' ' || coalesce(fi.answer, ''))
            @@ plainto_tsquery('german', ${q})
      ORDER BY ts_rank(
        to_tsvector('german', coalesce(fi.question, '') || ' ' || coalesce(fi.answer, '')),
        plainto_tsquery('german', ${q})
      ) DESC
      LIMIT ${RESULTS_PER_RESOURCE}
    `,
  ]);

  return NextResponse.json({
    success: true,
    data: {
      posts: posts.map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        category: { slug: p.category_slug, name: p.category_name },
      })),
      glossar: glossar.map((g) => ({
        slug: g.slug,
        term: g.term,
        acronym: g.acronym,
        shortDef: g.short_def,
      })),
      faq: faq.map((f) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
        categoryName: f.category_name,
      })),
    },
  });
}
