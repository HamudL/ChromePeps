"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownEditor } from "./markdown-editor";

export interface FaqItemFormInitial {
  id?: string;
  categoryId?: string;
  question?: string;
  answer?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export function FaqItemForm({
  mode,
  initial,
  categories,
}: {
  mode: "create" | "edit";
  initial: FaqItemFormInitial;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");
  const [question, setQuestion] = useState(initial.question ?? "");
  const [answer, setAnswer] = useState(initial.answer ?? "");
  const [sortOrder, setSortOrder] = useState(initial.sortOrder ?? 0);
  const [isPublished, setIsPublished] = useState(
    initial.isPublished ?? true,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      categoryId,
      question: question.trim(),
      answer: answer.trim(),
      sortOrder,
      isPublished,
    };
    try {
      const url =
        mode === "edit"
          ? `/api/admin/wissen/faq-items/${initial.id}`
          : "/api/admin/wissen/faq-items";
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
        `/api/admin/wissen/faq-items/${initial.id}`,
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

  const isValid =
    question.trim().length >= 3 &&
    answer.trim().length >= 3 &&
    categoryId.length > 0;

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/wissen/faq"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> FAQ
        </Link>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          {mode === "edit" ? "FAQ-Item bearbeiten" : "Neues FAQ-Item"}
        </h2>
      </div>
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_120px] gap-4">
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
              <Label htmlFor="fi-sort">Sortierung</Label>
              <Input
                id="fi-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(Math.max(0, parseInt(e.target.value) || 0))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fi-pub">Status</Label>
              <Select
                value={isPublished ? "1" : "0"}
                onValueChange={(v) => setIsPublished(v === "1")}
              >
                <SelectTrigger id="fi-pub">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Veröffentlicht</SelectItem>
                  <SelectItem value="0">Entwurf</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fi-q">Frage *</Label>
            <Textarea
              id="fi-q"
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="z.B. Wie lange dauert der Versand innerhalb Deutschlands?"
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Antwort (Markdown)</CardTitle>
        </CardHeader>
        <CardContent>
          <MarkdownEditor
            value={answer}
            onChange={setAnswer}
            rows={8}
            compact
            placeholder="Markdown-Antwort. Listen, Links und Bold funktionieren."
          />
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
