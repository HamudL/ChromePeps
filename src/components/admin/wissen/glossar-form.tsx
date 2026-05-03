"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownEditor } from "./markdown-editor";
import { slugify, cn } from "@/lib/utils";

export interface GlossarFormInitial {
  id?: string;
  slug?: string;
  term?: string;
  acronym?: string | null;
  shortDef?: string;
  longDef?: string | null;
  relatedPostSlugs?: string[];
}

interface Props {
  mode: "create" | "edit";
  initial: GlossarFormInitial;
  postSlugs: string[];
}

export function GlossarForm({ mode, initial, postSlugs }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const [term, setTerm] = useState(initial.term ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(initial.slug));
  const [acronym, setAcronym] = useState(initial.acronym ?? "");
  const [shortDef, setShortDef] = useState(initial.shortDef ?? "");
  const [longDef, setLongDef] = useState(initial.longDef ?? "");
  const [relatedPostSlugs, setRelatedPostSlugs] = useState<string[]>(
    initial.relatedPostSlugs ?? [],
  );

  useEffect(() => {
    if (!slugManual && term) setSlug(slugify(term));
  }, [term, slugManual]);

  const isValid = useMemo(
    () =>
      term.trim().length > 0 &&
      slug.trim().length > 0 &&
      shortDef.trim().length >= 10,
    [term, slug, shortDef],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      slug: slug.trim(),
      term: term.trim(),
      acronym: acronym.trim() || null,
      shortDef: shortDef.trim(),
      longDef: longDef.trim() || null,
      relatedPostSlugs,
    };

    try {
      const url =
        mode === "edit"
          ? `/api/admin/wissen/glossar/${initial.id}`
          : "/api/admin/wissen/glossar";
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
      router.push("/admin/wissen/glossar");
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
        `/api/admin/wissen/glossar/${initial.id}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Löschen fehlgeschlagen.");
        setDeleting(false);
        setShowDelete(false);
        return;
      }
      router.push("/admin/wissen/glossar");
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
      setDeleting(false);
    }
  }

  function togglePost(s: string) {
    setRelatedPostSlugs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/wissen/glossar"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Glossar
        </Link>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          {mode === "edit" ? "Begriff bearbeiten" : "Neuer Begriff"}
        </h2>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="g-term">Begriff *</Label>
              <Input
                id="g-term"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="z.B. HPLC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-acronym">Akronym/Langform</Label>
              <Input
                id="g-acronym"
                value={acronym}
                onChange={(e) => setAcronym(e.target.value)}
                placeholder="z.B. Hochleistungs-Flüssigchromatographie"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-slug">Slug *</Label>
            <Input
              id="g-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManual(true);
              }}
              placeholder="hplc"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              URL: /wissen/glossar#{slug || "[slug]"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-short">Kurze Definition *</Label>
            <Textarea
              id="g-short"
              rows={3}
              value={shortDef}
              onChange={(e) => setShortDef(e.target.value)}
              placeholder="1–3 Sätze. Wird in der Glossar-Liste angezeigt."
            />
            <p className="text-[11px] text-muted-foreground">
              Mindestens 10, max 800 Zeichen. {shortDef.length}/800.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Lange Definition (optional, Markdown)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MarkdownEditor
            value={longDef}
            onChange={setLongDef}
            rows={10}
            compact
            placeholder="Detail-Erklärung mit Listen, Code, Links… Aktuell auf der Live-Seite noch nicht angezeigt — vorbereitet für eine spätere Detail-Ansicht."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verwandte Artikel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border border-border rounded-md p-2">
            {postSlugs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Noch keine Artikel vorhanden.
              </p>
            ) : (
              postSlugs.map((s) => {
                const active = relatedPostSlugs.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => togglePost(s)}
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
            Verlinken den Begriff zu Artikeln — wird in einer
            späteren Iteration als „Erwähnt in:“-Block angezeigt.
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
        <Button type="submit" disabled={saving || !isValid}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Speichern
        </Button>
      </div>
    </form>
  );
}
