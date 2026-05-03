"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/admin/image-upload";
import { MarkdownEditor } from "./markdown-editor";
import {
  ArticleLivePreview,
  type PreviewAuthorData,
  type PreviewCategoryData,
} from "./article-live-preview";
import { slugify } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Form für Create + Edit eines Blog-Posts. Side-by-Side-Layout:
 *  - Links: Form-Fields (Sektionen via Cards) + MarkdownEditor für Body
 *  - Rechts: ArticleLivePreview (gleiche Komponenten wie Live-Page)
 *
 * Auf < xl Breakpoint: Tab-Switcher zwischen Edit/Preview damit
 * der Editor auf engen Monitoren / Tablets nutzbar bleibt.
 *
 * Slug wird auto-generiert aus Titel (mit Override). Manuell editierter
 * Slug wird nicht überschrieben sobald `slugManuallyEdited === true`.
 */

export interface BlogPostFormCategoryOption {
  id: string;
  slug: string;
  name: string;
}
export interface BlogPostFormAuthorOption {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  bio: string | null;
  orcid: string | null;
}

export interface BlogPostFormInitial {
  id?: string;
  slug?: string;
  title?: string;
  titleEmphasis?: string | null;
  excerpt?: string;
  contentMdx?: string;
  coverImage?: string | null;
  readingMinutes?: number;
  authorId?: string;
  categoryId?: string;
  tags?: string[];
  relatedGlossarSlugs?: string[];
  featuredBatchProductSlug?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt?: Date | null;
  updatedManually?: Date | null;
}

interface Props {
  mode: "create" | "edit";
  initial: BlogPostFormInitial;
  categories: BlogPostFormCategoryOption[];
  authors: BlogPostFormAuthorOption[];
  /** Aktive Produkt-Slugs für den featuredBatchProductSlug-Picker. */
  productSlugs: string[];
  /** Bestehende Glossar-Slugs für Related-Multi-Select. */
  glossarSlugs: string[];
}

const TAGS_HELPER =
  "Komma-separiert. Z.B. „HPLC, Reinheit, Janoshik“ — werden als Strings gespeichert (kein eigenes Tag-System).";

export function BlogPostForm({
  mode,
  initial,
  categories,
  authors,
  productSlugs,
  glossarSlugs,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  const [slug, setSlug] = useState(initial.slug ?? "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    Boolean(initial.slug),
  );
  const [title, setTitle] = useState(initial.title ?? "");
  const [titleEmphasis, setTitleEmphasis] = useState(
    initial.titleEmphasis ?? "",
  );
  const [excerpt, setExcerpt] = useState(initial.excerpt ?? "");
  const [contentMdx, setContentMdx] = useState(initial.contentMdx ?? "");
  const [coverImage, setCoverImage] = useState<string | null>(
    initial.coverImage ?? null,
  );
  const [readingMinutes, setReadingMinutes] = useState(
    initial.readingMinutes ?? 5,
  );
  const [authorId, setAuthorId] = useState(initial.authorId ?? "");
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");
  const [tagsInput, setTagsInput] = useState(
    (initial.tags ?? []).join(", "),
  );
  const [relatedGlossarSlugs, setRelatedGlossarSlugs] = useState<string[]>(
    initial.relatedGlossarSlugs ?? [],
  );
  const [featuredBatchProductSlug, setFeaturedBatchProductSlug] = useState(
    initial.featuredBatchProductSlug ?? "",
  );
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    initial.seoDescription ?? "",
  );
  const [isPublished, setIsPublished] = useState(
    Boolean(initial.publishedAt),
  );
  const [publishedAt] = useState<Date | null>(initial.publishedAt ?? null);

  // Slug auto-fill aus Titel solange User ihn nicht selbst editiert hat.
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsInput],
  );

  const selectedAuthor = useMemo<PreviewAuthorData | null>(() => {
    const a = authors.find((x) => x.id === authorId);
    if (!a) return null;
    return { name: a.name, title: a.title, bio: a.bio, orcid: a.orcid };
  }, [authorId, authors]);

  const selectedCategory = useMemo<PreviewCategoryData | null>(() => {
    const c = categories.find((x) => x.id === categoryId);
    if (!c) return null;
    return { name: c.name, slug: c.slug };
  }, [categoryId, categories]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      slug: slug.trim(),
      title: title.trim(),
      titleEmphasis: titleEmphasis.trim() || null,
      excerpt: excerpt.trim(),
      contentMdx,
      coverImage: coverImage || null,
      readingMinutes,
      authorId,
      categoryId,
      tags,
      relatedGlossarSlugs,
      featuredBatchProductSlug: featuredBatchProductSlug.trim() || null,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
      publishedAt: isPublished
        ? (publishedAt ?? new Date()).toISOString()
        : null,
      // Wenn editiert + bereits published: updatedManually setzen, damit
      // "Akt. dd.mm.yyyy" auf der Live-Seite angezeigt wird.
      updatedManually:
        mode === "edit" && initial.publishedAt
          ? new Date().toISOString()
          : null,
    };

    try {
      const url =
        mode === "edit"
          ? `/api/admin/wissen/posts/${initial.id}`
          : "/api/admin/wissen/posts";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }
      router.push("/admin/wissen/posts");
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (mode !== "edit" || !initial.id) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/wissen/posts/${initial.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Löschen fehlgeschlagen.");
        setDeleting(false);
        setShowDeleteConfirm(false);
        return;
      }
      router.push("/admin/wissen/posts");
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
      setDeleting(false);
    }
  }

  function toggleRelatedGlossar(s: string) {
    setRelatedGlossarSlugs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  const titleEmphasisError =
    titleEmphasis && title && !title.includes(titleEmphasis)
      ? "Hinweis: titleEmphasis kommt nicht im Titel vor — Italic-Highlight wird nicht gerendert."
      : null;

  const formIsValid =
    slug.trim().length > 0 &&
    title.trim().length > 0 &&
    excerpt.trim().length >= 20 &&
    contentMdx.trim().length >= 20 &&
    authorId &&
    categoryId;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 border-b border-border bg-background/95 backdrop-blur px-6 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" type="button">
              <Link href="/admin/wissen/posts">
                <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
              </Link>
            </Button>
            <h2 className="text-lg font-semibold tracking-tight">
              {mode === "edit"
                ? "Artikel bearbeiten"
                : "Neuer Artikel"}
            </h2>
            <span
              className={cn(
                "ml-2 mono-tag inline-flex items-center px-2 py-0.5 rounded-sm border",
                isPublished
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-amber-300 bg-amber-50 text-amber-700",
              )}
              style={{ letterSpacing: "0.18em" }}
            >
              {isPublished ? "Veröffentlicht" : "Entwurf"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Edit/Preview-Tabs nur sichtbar auf < xl (Side-by-Side
                übernimmt darüber). */}
            <div className="flex xl:hidden rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setPreviewMode("edit")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5",
                  previewMode === "edit"
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted",
                )}
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("preview")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5",
                  previewMode === "preview"
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted",
                )}
              >
                <Eye className="h-3 w-3" /> Vorschau
              </button>
            </div>

            {mode === "edit" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Löschen
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPublished((v) => !v)}
              disabled={saving}
            >
              {isPublished ? (
                <>
                  <EyeOff className="mr-2 h-3.5 w-3.5" /> Auf Entwurf
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-3.5 w-3.5" /> Veröffentlichen
                </>
              )}
            </Button>
            <Button type="submit" size="sm" disabled={saving || !formIsValid}>
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              <Save className="mr-2 h-3.5 w-3.5" />
              Speichern
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {showDeleteConfirm && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
            <span className="text-destructive font-medium">
              Diesen Artikel wirklich permanent löschen?
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              Ja, endgültig löschen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Abbrechen
            </Button>
          </div>
        )}
      </div>

      {/* Main 2-col-grid auf xl+, sonst single-col mit tab-toggle */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT — Form */}
        <div
          className={cn(
            "space-y-6",
            previewMode === "preview" && "hidden xl:block",
          )}
        >
          {/* Basis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="post-title">Titel *</Label>
                <Input
                  id="post-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. HPLC-Reinheitsanalyse: wie wir Peptide auf 98 %+ testen"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-emphasis">
                  Italic-Highlight im Titel{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="post-emphasis"
                  value={titleEmphasis}
                  onChange={(e) => setTitleEmphasis(e.target.value)}
                  placeholder="z.B. wie wir Peptide"
                />
                <p className="text-[11px] text-muted-foreground">
                  Substring im Titel der als <em>kursiv</em>-Akzent
                  (Fraunces) gerendert wird. Muss exakt im Titel vorkommen.
                </p>
                {titleEmphasisError && (
                  <p className="text-[11px] text-amber-700">
                    {titleEmphasisError}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="post-slug">Slug *</Label>
                  <Input
                    id="post-slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugManuallyEdited(true);
                    }}
                    placeholder="hplc-reinheitsanalyse"
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Wird auto-generiert aus dem Titel; manuelle Edits
                    überschreiben das Auto-Update.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-reading">Lesezeit (min)</Label>
                  <Input
                    id="post-reading"
                    type="number"
                    min={1}
                    max={120}
                    value={readingMinutes}
                    onChange={(e) =>
                      setReadingMinutes(
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-excerpt">Excerpt *</Label>
                <Textarea
                  id="post-excerpt"
                  rows={3}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Kurzer Teaser — 1–3 Sätze, wird auf Hub und in der Liste gezeigt."
                />
                <p className="text-[11px] text-muted-foreground">
                  Mindestens 20, max 500 Zeichen. {excerpt.length}/500.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Kategorie + Author */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kategorie & Autor</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategorie *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Autor *</Label>
                <Select value={authorId} onValueChange={setAuthorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {authors.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                        {a.title ? ` · ${a.title}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Bio + ORCID kommen aus dem Author-Profil — bei Bedarf
                  unter „Autoren“ pflegen.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Body */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Body (Markdown)</CardTitle>
              <CardDescription>
                Standard-Markdown + GFM (Tabellen, Strikethrough). GitHub-
                Style-Alerts (`&gt; [!NOTE]`, `&gt; [!WARNING]`,
                `&gt; [!IMPORTANT]`) werden zu Callout-Boxen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownEditor
                value={contentMdx}
                onChange={setContentMdx}
                rows={28}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Mindestens 20 Zeichen. Aktuell: {contentMdx.length}.
              </p>
            </CardContent>
          </Card>

          {/* Cover */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover-Image</CardTitle>
              <CardDescription>
                21:9-Aspect, wird über dem Body angezeigt. Wenn leer:
                automatisches Glyph-Cover je nach Kategorie.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                images={coverImage ? [coverImage] : []}
                onChange={(arr) => setCoverImage(arr[0] ?? null)}
              />
            </CardContent>
          </Card>

          {/* Tags + Related Glossar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tags + verwandte Begriffe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="post-tags">Tags</Label>
                <Input
                  id="post-tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="HPLC, Reinheit, Janoshik"
                />
                <p className="text-[11px] text-muted-foreground">
                  {TAGS_HELPER}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Verwandte Glossar-Begriffe</Label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border border-border rounded-md p-2">
                  {glossarSlugs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Noch keine Glossar-Begriffe — unter „Glossar“ anlegen.
                    </p>
                  ) : (
                    glossarSlugs.map((s) => {
                      const active = relatedGlossarSlugs.includes(s);
                      return (
                        <button
                          type="button"
                          key={s}
                          onClick={() => toggleRelatedGlossar(s)}
                          className={cn(
                            "inline-flex items-center font-mono text-[11px] px-2 py-1 rounded-md border transition-colors",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
                          )}
                          style={{ letterSpacing: "0.02em" }}
                        >
                          {active ? "✓ " : ""}
                          {s}
                        </button>
                      );
                    })
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Erscheinen im Article-Sidebar als „→ slug“-Links zu
                  /wissen/glossar#slug.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Featured Batch Product */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Aktuelle-Charge-Karte (BatchInfoCard)
              </CardTitle>
              <CardDescription>
                Optional: ein Produkt-Slug, dessen aktuelle COA als Live-
                Karte unter dem Body angezeigt wird (z.B. bei Methodik-
                Artikeln).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={featuredBatchProductSlug || "_none"}
                onValueChange={(v) =>
                  setFeaturedBatchProductSlug(v === "_none" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Keine Karte —</SelectItem>
                  {productSlugs.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO</CardTitle>
              <CardDescription>
                Wenn leer: Titel + Excerpt werden als Meta-Tags genutzt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="post-seo-title">SEO-Titel</Label>
                <Input
                  id="post-seo-title"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Wenn leer: Titel + ' — ChromePeps Wissen'"
                />
                <p className="text-[11px] text-muted-foreground">
                  Empfohlen 50–60 Zeichen. {seoTitle.length}/120.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-seo-desc">SEO-Description</Label>
                <Textarea
                  id="post-seo-desc"
                  rows={2}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Wenn leer: Excerpt"
                />
                <p className="text-[11px] text-muted-foreground">
                  Empfohlen 150–160 Zeichen. {seoDescription.length}/300.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Live-Preview */}
        <div
          className={cn(
            "xl:sticky xl:top-[100px] xl:self-start xl:max-h-[calc(100vh-120px)] xl:overflow-y-auto rounded-lg border border-border bg-background",
            previewMode === "edit" && "hidden xl:block",
          )}
        >
          <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span className="mono-tag" style={{ fontSize: 10 }}>
              Live-Vorschau · 1:1 wie /wissen/{slug || "[slug]"}
            </span>
            {slug && mode === "edit" && initial.publishedAt && (
              <Link
                href={`/wissen/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] hover:text-primary"
              >
                Live öffnen ↗
              </Link>
            )}
          </div>
          <ArticleLivePreview
            title={title}
            titleEmphasis={titleEmphasis || null}
            excerpt={excerpt}
            contentMdx={contentMdx}
            coverImage={coverImage}
            readingMinutes={readingMinutes}
            publishedAt={isPublished ? (publishedAt ?? new Date()) : null}
            updatedManually={null}
            featuredBatchProductSlug={featuredBatchProductSlug || null}
            relatedGlossarSlugs={relatedGlossarSlugs}
            category={selectedCategory}
            author={selectedAuthor}
          />
        </div>
      </div>
    </form>
  );
}
