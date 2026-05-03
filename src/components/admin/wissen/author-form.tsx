"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/admin/image-upload";
import { MarkdownEditor } from "./markdown-editor";
import { slugify } from "@/lib/utils";

export interface AuthorFormInitial {
  id?: string;
  slug?: string;
  name?: string;
  title?: string | null;
  bio?: string | null;
  avatar?: string | null;
  orcid?: string | null;
  postCount?: number;
}

interface Props {
  mode: "create" | "edit";
  initial: AuthorFormInitial;
}

export function AuthorForm({ mode, initial }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const [name, setName] = useState(initial.name ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(initial.slug));
  const [title, setTitle] = useState(initial.title ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [avatar, setAvatar] = useState<string | null>(
    initial.avatar ?? null,
  );
  const [orcid, setOrcid] = useState(initial.orcid ?? "");

  useEffect(() => {
    if (!slugManual && name) setSlug(slugify(name));
  }, [name, slugManual]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      slug: slug.trim(),
      name: name.trim(),
      title: title.trim() || null,
      bio: bio.trim() || null,
      avatar: avatar || null,
      orcid: orcid.trim() || null,
    };

    try {
      const url =
        mode === "edit"
          ? `/api/admin/wissen/authors/${initial.id}`
          : "/api/admin/wissen/authors";
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
      router.push("/admin/wissen/authors");
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
      const res = await fetch(
        `/api/admin/wissen/authors/${initial.id}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Löschen fehlgeschlagen.");
        setDeleting(false);
        setShowDelete(false);
        return;
      }
      router.push("/admin/wissen/authors");
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/wissen/authors"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Autoren
        </Link>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          {mode === "edit" ? "Autor bearbeiten" : "Neuer Autor"}
        </h2>
        {mode === "edit" && initial.postCount !== undefined && (
          <p className="text-sm text-muted-foreground mt-1">
            {initial.postCount}{" "}
            {initial.postCount === 1
              ? "Artikel von diesem Autor"
              : "Artikel von diesem Autor"}
            .
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="auth-name">Name *</Label>
              <Input
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Dr. M. Reichert"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-title">Titel/Rolle</Label>
              <Input
                id="auth-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Analytische Chemie"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="auth-slug">Slug *</Label>
              <Input
                id="auth-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManual(true);
                }}
                placeholder="dr-m-reichert"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Interner Identifier. Wird auto-generiert aus Name.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-orcid">ORCID</Label>
              <Input
                id="auth-orcid"
                value={orcid}
                onChange={(e) => setOrcid(e.target.value)}
                placeholder="0000-0002-1942-8013"
                className="font-mono text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bio (Markdown)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <MarkdownEditor
            value={bio}
            onChange={setBio}
            rows={8}
            compact
            placeholder="z.B. Analytische Chemikerin, Promotion in HPLC-Methodenentwicklung…"
          />
          <p className="text-[11px] text-muted-foreground">
            Wird in der Author-Box am Ende jedes Artikels angezeigt.
            Markdown-Syntax (Links, Bold, etc.) funktioniert.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload
            images={avatar ? [avatar] : []}
            onChange={(arr) => setAvatar(arr[0] ?? null)}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Optional. Quadratisch empfohlen (z.B. 256×256). Aktuell wird
            der Avatar nicht im Frontend angezeigt — Initials-Avatar
            wird per Default gerendert.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          {mode === "edit" && !showDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDelete(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Löschen
            </Button>
          )}
          {showDelete && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive font-medium">
                Wirklich löschen?
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
                Ja, löschen
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDelete(false)}
              >
                Abbrechen
              </Button>
            </div>
          )}
        </div>
        <Button
          type="submit"
          disabled={saving || !name.trim() || !slug.trim()}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Speichern
        </Button>
      </div>
    </form>
  );
}
