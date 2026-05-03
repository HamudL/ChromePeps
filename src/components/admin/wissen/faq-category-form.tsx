"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { slugify } from "@/lib/utils";

export interface FaqCategoryFormInitial {
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  sortOrder?: number;
  itemCount?: number;
}

export function FaqCategoryForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial: FaqCategoryFormInitial;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const [name, setName] = useState(initial.name ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(initial.slug));
  const [description, setDescription] = useState(initial.description ?? "");
  const [sortOrder, setSortOrder] = useState(initial.sortOrder ?? 0);

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
      description: description.trim() || null,
      sortOrder,
    };
    try {
      const url =
        mode === "edit"
          ? `/api/admin/wissen/faq-categories/${initial.id}`
          : "/api/admin/wissen/faq-categories";
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
      router.push("/admin/wissen/faq");
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
        `/api/admin/wissen/faq-categories/${initial.id}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Löschen fehlgeschlagen.");
        setDeleting(false);
        setShowDelete(false);
        return;
      }
      router.push("/admin/wissen/faq");
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/wissen/faq"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> FAQ
        </Link>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          {mode === "edit"
            ? "FAQ-Kategorie bearbeiten"
            : "Neue FAQ-Kategorie"}
        </h2>
      </div>
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Felder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fc-name">Name *</Label>
            <Input
              id="fc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Bestellung & Versand"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fc-slug">Slug *</Label>
            <Input
              id="fc-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManual(true);
              }}
              placeholder="bestellung-versand"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fc-desc">Beschreibung</Label>
            <Textarea
              id="fc-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2 max-w-32">
            <Label htmlFor="fc-sort">Sortierung</Label>
            <Input
              id="fc-sort"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(Math.max(0, parseInt(e.target.value) || 0))
              }
            />
          </div>
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
