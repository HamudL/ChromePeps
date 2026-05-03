-- Author-Modell als 1st-class Tabelle. Backfill aus den existing
-- denormalisierten authorName/Title/Bio/Avatar/Orcid Spalten der
-- blog_posts. Nach Backfill: alte Spalten droppen, FK setzen.
--
-- Idempotenz-relevant: das Backfill-INSERT nutzt ON CONFLICT damit
-- ein Re-Run nicht failed (z.B. nach manuellem migrate resolve).

-- Step 1: CREATE Author-Tabelle
CREATE TABLE "authors" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "avatar" TEXT,
    "orcid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- Step 2: BlogPost.authorId nullable hinzufügen (FK kommt später)
ALTER TABLE "blog_posts" ADD COLUMN "authorId" TEXT;

-- Step 3: Backfill — pro distinct authorName aus blog_posts einen
-- Author erzeugen. Slug = lower(name) mit Whitespace→"-", Sonderzeichen
-- entfernt. Generierte ID = gen_random_uuid()-text (Postgres uuid_generate
-- ist nicht überall verfügbar, gen_random_uuid aus pgcrypto ist Standard
-- in Postgres 13+).
INSERT INTO "authors" ("id", "slug", "name", "title", "bio", "avatar", "orcid", "updatedAt")
SELECT
    'auth_' || REPLACE(gen_random_uuid()::text, '-', '') AS id,
    -- Slug: lowercase, " " → "-", non-alphanumeric removed, leading/trailing "-" trimmed
    TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(distinct_authors."authorName"), '[^a-z0-9]+', '-', 'g')) AS slug,
    distinct_authors."authorName" AS name,
    distinct_authors."authorTitle" AS title,
    distinct_authors."authorBio" AS bio,
    distinct_authors."authorAvatar" AS avatar,
    distinct_authors."authorOrcid" AS orcid,
    CURRENT_TIMESTAMP AS "updatedAt"
FROM (
    -- Distinct on authorName: nimm pro Name das first-seen Author-Profil.
    -- Wenn ein Autor in mehreren Posts mit unterschiedlichen Bios
    -- hinterlegt wurde, gewinnt der älteste Post (createdAt asc).
    SELECT DISTINCT ON ("authorName")
        "authorName",
        "authorTitle",
        "authorBio",
        "authorAvatar",
        "authorOrcid"
    FROM "blog_posts"
    ORDER BY "authorName", "createdAt" ASC
) AS distinct_authors
ON CONFLICT (slug) DO NOTHING;

-- Step 4: BlogPost.authorId aus dem matching Author füllen
UPDATE "blog_posts" bp
SET "authorId" = a.id
FROM "authors" a
WHERE a.name = bp."authorName";

-- Step 5: authorId NOT NULL setzen + FK constraint
ALTER TABLE "blog_posts" ALTER COLUMN "authorId" SET NOT NULL;

ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "blog_posts_authorId_idx" ON "blog_posts"("authorId");

-- Step 6: alte denormalisierte Author-Spalten droppen
ALTER TABLE "blog_posts"
    DROP COLUMN "authorName",
    DROP COLUMN "authorTitle",
    DROP COLUMN "authorBio",
    DROP COLUMN "authorAvatar",
    DROP COLUMN "authorOrcid";
