export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, ExternalLink, FolderPlus, PenLine, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * FAQ-Admin-Master-Detail-Page.
 * Zeigt alle Categories als Cards, in jeder Card die Items expanded.
 * Inline-Buttons: Edit Category, New Item in Category, Edit Item.
 */
export default async function WissenFaqPage() {
  await requireAdmin();

  const categories = await db.fAQCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/wissen"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Wissen
          </Link>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">FAQ</h2>
          <p className="text-muted-foreground">
            {categories.length}{" "}
            {categories.length === 1 ? "Kategorie" : "Kategorien"} ·{" "}
            {totalItems} {totalItems === 1 ? "Item" : "Items"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href="/faq" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Live öffnen
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/wissen/faq/categories/new">
              <FolderPlus className="mr-2 h-4 w-4" /> Neue Kategorie
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/wissen/faq/items/new">
              <Plus className="mr-2 h-4 w-4" /> Neues Item
            </Link>
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Noch keine FAQ-Kategorien.</p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/admin/wissen/faq/categories/new">
                <FolderPlus className="mr-2 h-3.5 w-3.5" /> Erste Kategorie anlegen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-0 gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-3">
                    <span>{c.name}</span>
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">
                      {c.items.length}{" "}
                      {c.items.length === 1 ? "Item" : "Items"} · sort{" "}
                      {c.sortOrder}
                    </span>
                  </CardTitle>
                  {c.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/admin/wissen/faq/items/new?categoryId=${c.id}`}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Item
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon">
                    <Link
                      href={`/admin/wissen/faq/categories/${c.id}`}
                      aria-label="Kategorie bearbeiten"
                    >
                      <PenLine className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {c.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-4">
                    Noch keine Items in dieser Kategorie.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {c.items.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-start justify-between gap-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/admin/wissen/faq/items/${it.id}`}
                            className="font-medium text-sm hover:underline"
                          >
                            {it.question}
                          </Link>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {it.answer}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={
                                it.isPublished
                                  ? "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-700"
                              }
                            >
                              {it.isPublished ? "Live" : "Entwurf"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              sort {it.sortOrder}
                            </span>
                          </div>
                        </div>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label="Item bearbeiten"
                        >
                          <Link href={`/admin/wissen/faq/items/${it.id}`}>
                            <PenLine className="h-4 w-4" />
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
