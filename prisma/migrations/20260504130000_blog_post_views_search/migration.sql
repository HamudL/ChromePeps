-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex (Meistgelesen-Sortierung pro Kategorie)
CREATE INDEX "blog_posts_categoryId_viewCount_idx" ON "blog_posts"("categoryId", "viewCount" DESC);

-- ============================================================
-- Full-Text-Search-Indices (deutsch).
-- Werden direkt als raw SQL angelegt — Prisma kennt keine GIN/tsvector-
-- Indices nativ. Für die Search-Endpoint reicht ein einfaches
-- to_tsvector('german', ...) ILIKE-fallback wäre möglich, aber GIN +
-- to_tsquery ist bei wachsendem Content schneller.
-- ============================================================

-- Blog-Post: title + excerpt
CREATE INDEX "blog_post_search_idx" ON "blog_posts"
  USING GIN (to_tsvector('german', coalesce("title", '') || ' ' || coalesce("excerpt", '')));

-- Glossar: term + acronym + shortDef
CREATE INDEX "glossar_term_search_idx" ON "glossar_terms"
  USING GIN (to_tsvector('german', coalesce("term", '') || ' ' || coalesce("acronym", '') || ' ' || coalesce("shortDef", '')));

-- FAQ-Items: question + answer
CREATE INDEX "faq_item_search_idx" ON "faq_items"
  USING GIN (to_tsvector('german', coalesce("question", '') || ' ' || coalesce("answer", '')));
