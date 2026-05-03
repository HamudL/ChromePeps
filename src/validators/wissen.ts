import { z } from "zod";

/**
 * Validators für das Wissen-CMS unter /admin/wissen.
 *
 * Konvention: alle Slugs sind lowercased + dash-separated, max 80
 * Zeichen — siehe slugify() in @/lib/utils. Server normalisiert das
 * vor Insert/Update (User kann großschreiben, kommt sauber zurück).
 */

const slugSchema = z
  .string()
  .min(1, "Slug darf nicht leer sein")
  .max(80, "Slug zu lang (max 80 Zeichen)")
  .regex(/^[a-z0-9-]+$/, "Slug nur aus a-z, 0-9 und Bindestrich");

// ---------- Author ----------

export const createAuthorSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1, "Name ist Pflicht").max(120),
  title: z.string().max(120).nullish(),
  bio: z.string().max(2000).nullish(),
  avatar: z.string().nullish(),
  orcid: z.string().max(40).nullish(),
});

export const updateAuthorSchema = createAuthorSchema.partial().extend({
  id: z.string().cuid(),
});

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;
export type UpdateAuthorInput = z.infer<typeof updateAuthorSchema>;

// ---------- BlogCategory ----------

export const createBlogCategorySchema = z.object({
  slug: slugSchema,
  name: z.string().min(1, "Name ist Pflicht").max(120),
  description: z.string().max(500).nullish(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateBlogCategorySchema = createBlogCategorySchema
  .partial()
  .extend({ id: z.string().cuid() });

export type CreateBlogCategoryInput = z.infer<
  typeof createBlogCategorySchema
>;
export type UpdateBlogCategoryInput = z.infer<
  typeof updateBlogCategorySchema
>;

// ---------- BlogPost ----------

export const createBlogPostSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1, "Titel ist Pflicht").max(200),
  titleEmphasis: z.string().max(200).nullish(),
  excerpt: z
    .string()
    .min(20, "Excerpt mindestens 20 Zeichen")
    .max(500, "Excerpt max 500 Zeichen"),
  contentMdx: z.string().min(20, "Body mindestens 20 Zeichen"),
  coverImage: z.string().nullish(),
  readingMinutes: z.number().int().min(1).max(120).default(5),
  authorId: z.string().cuid("Author ist Pflicht"),
  categoryId: z.string().cuid("Kategorie ist Pflicht"),
  tags: z.array(z.string().max(40)).max(20).default([]),
  relatedGlossarSlugs: z.array(z.string().max(80)).max(20).default([]),
  featuredBatchProductSlug: z.string().max(120).nullish(),
  seoTitle: z.string().max(120).nullish(),
  seoDescription: z.string().max(300).nullish(),
  // ISO-Date-String oder null. Frontend setzt das auf now() bei Publish-
  // Click, oder null für Draft.
  publishedAt: z.coerce.date().nullish(),
  updatedManually: z.coerce.date().nullish(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial().extend({
  id: z.string().cuid(),
});

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;

// ---------- FAQ ----------

export const createFaqCategorySchema = z.object({
  slug: slugSchema,
  name: z.string().min(1, "Name ist Pflicht").max(120),
  description: z.string().max(500).nullish(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateFaqCategorySchema = createFaqCategorySchema
  .partial()
  .extend({ id: z.string().cuid() });

export type CreateFaqCategoryInput = z.infer<typeof createFaqCategorySchema>;
export type UpdateFaqCategoryInput = z.infer<typeof updateFaqCategorySchema>;

export const createFaqItemSchema = z.object({
  categoryId: z.string().cuid(),
  question: z.string().min(3).max(500),
  answer: z.string().min(3).max(5000),
  sortOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
});

export const updateFaqItemSchema = createFaqItemSchema.partial().extend({
  id: z.string().cuid(),
});

export type CreateFaqItemInput = z.infer<typeof createFaqItemSchema>;
export type UpdateFaqItemInput = z.infer<typeof updateFaqItemSchema>;

// ---------- Glossar ----------

export const createGlossarTermSchema = z.object({
  slug: slugSchema,
  term: z.string().min(1).max(120),
  acronym: z.string().max(120).nullish(),
  shortDef: z.string().min(10).max(800),
  longDef: z.string().max(5000).nullish(),
  relatedPostSlugs: z.array(z.string().max(80)).max(20).default([]),
});

export const updateGlossarTermSchema = createGlossarTermSchema
  .partial()
  .extend({ id: z.string().cuid() });

export type CreateGlossarTermInput = z.infer<typeof createGlossarTermSchema>;
export type UpdateGlossarTermInput = z.infer<typeof updateGlossarTermSchema>;
