import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Base URL with sensible fallback for local/dev builds.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Force dynamic so the sitemap is regenerated on every request.
// Cheap enough (two indexed queries) and always reflects catalog changes.
export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];

function staticRoutes(): SitemapEntry[] {
  const now = new Date();
  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/wissen`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/wissen/glossar`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
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
    const [products, categories, blogPosts, blogCategories, glossarTerms] =
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
        db.glossarTerm.findMany({
          select: { slug: true, updatedAt: true },
          orderBy: { term: "asc" },
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

    // Glossar-Begriffe als URL-Fragments innerhalb der Glossar-Seite —
    // ein eigener Crawl-Stop ist nicht sinnvoll, aber Hash-URLs in der
    // Sitemap helfen Google trotzdem, einzelne Begriffe als Featured
    // Snippets zu rankings (kanonisch ist die Glossar-Seite).
    const glossarTermEntries: SitemapEntry[] = glossarTerms.map((t) => ({
      url: `${BASE_URL}/wissen/glossar#${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));

    return [
      ...staticRoutes(),
      ...categoryEntries,
      ...productEntries,
      ...blogCategoryEntries,
      ...blogPostEntries,
      ...glossarTermEntries,
    ];
  } catch (error) {
    // If the DB is unreachable at build time, still serve static routes
    // so the sitemap doesn't fail the build.
    console.error("[sitemap] failed to load dynamic entries", error);
    return staticRoutes();
  }
}
