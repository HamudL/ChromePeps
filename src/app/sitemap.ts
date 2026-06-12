import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Base URL with sensible fallback for local/dev builds.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// force-dynamic (Revision der früheren ISR-Entscheidung aus
// AUDIT_REPORT_v3 §4.13): Der CI-Build hat keine DATABASE_URL — das
// Build-Prerender backte über den catch-Fallback eine auf die
// staticRoutes() geschrumpfte Sitemap OHNE Produkt-/Artikel-URLs ins
// Image. Da der ISR-Cache (.next/cache) auf keinem Volume liegt,
// servierte JEDER Deploy/Container-Restart Crawlern bis zu 1h diese
// Rumpf-Sitemap. Die eingesparte Last (5 parallele Queries, wenige
// Crawler-Polls/Tag) rechtfertigt das nicht — per-Request ist hier
// die korrekte, billige Wahl.
export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];

function staticRoutes(): SitemapEntry[] {
  const now = new Date();
  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/wissen`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/wissen/glossar`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/ueber-uns`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/qualitaetskontrolle`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/kontakt`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE_URL}/versand`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/zahlung`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/impressum`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/datenschutz`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/agb`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/widerruf`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [products, categories, blogPosts, blogCategories] =
      await Promise.all([
        db.product.findMany({
          where: { isActive: true },
          select: { slug: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
        }),
        db.category.findMany({
          select: { slug: true, updatedAt: true },
          orderBy: { sortOrder: "asc" },
        }),
        db.blogPost.findMany({
          where: { publishedAt: { not: null } },
          select: { slug: true, updatedAt: true, updatedManually: true },
          orderBy: { publishedAt: "desc" },
        }),
        db.blogCategory.findMany({
          select: { slug: true, updatedAt: true },
          orderBy: { sortOrder: "asc" },
        }),
      ]);

    const productEntries: SitemapEntry[] = products.map((product) => ({
      url: `${BASE_URL}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const categoryEntries: SitemapEntry[] = categories.map((category) => ({
      url: `${BASE_URL}/products/category/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const blogPostEntries: SitemapEntry[] = blogPosts.map((post) => ({
      url: `${BASE_URL}/wissen/${post.slug}`,
      lastModified: post.updatedManually ?? post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const blogCategoryEntries: SitemapEntry[] = blogCategories.map((cat) => ({
      url: `${BASE_URL}/wissen/kategorie/${cat.slug}`,
      lastModified: cat.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    // Glossar-Begriffe stehen bewusst NICHT mehr in der Sitemap:
    // URLs mit #fragment sind in Sitemaps unzulässig (Sitemap-Protokoll
    // erlaubt nur kanonische Voll-URLs; Google ignoriert/bemängelt
    // Fragment-Einträge). Die Glossar-Seite selbst ist über
    // staticRoutes() (/wissen/glossar) abgedeckt.

    return [
      ...staticRoutes(),
      ...categoryEntries,
      ...productEntries,
      ...blogCategoryEntries,
      ...blogPostEntries,
    ];
  } catch (error) {
    // If the DB is unreachable at build time, still serve static routes
    // so the sitemap doesn't fail the build.
    console.error("[sitemap] failed to load dynamic entries", error);
    return staticRoutes();
  }
}
