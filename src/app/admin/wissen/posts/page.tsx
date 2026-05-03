export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, ExternalLink, PenLine, Plus } from "lucide-react";
import { format } from "date-fns";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Props {
  searchParams: Promise<{ status?: string; category?: string }>;
}

const STATUS_TABS = [
  { id: "all", label: "Alle" },
  { id: "published", label: "Veröffentlicht" },
  { id: "draft", label: "Entwürfe" },
] as const;

export default async function WissenPostsListPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const status = sp.status === "published" || sp.status === "draft" ? sp.status : "all";
  const categoryFilter = sp.category && sp.category !== "all" ? sp.category : null;

  const where = {
    ...(status === "published" ? { publishedAt: { not: null } } : {}),
    ...(status === "draft" ? { publishedAt: null } : {}),
    ...(categoryFilter ? { categoryId: categoryFilter } : {}),
  };

  const [posts, categories] = await Promise.all([
    db.blogPost.findMany({
      where,
      orderBy: [
        // Drafts oben, dann published nach Datum
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        category: { select: { id: true, slug: true, name: true } },
        author: { select: { name: true } },
      },
    }),
    db.blogCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  function buildHref(over: { status?: string; category?: string }): string {
    const next = new URLSearchParams();
    const s = over.status ?? status;
    const c = over.category ?? categoryFilter ?? "all";
    if (s !== "all") next.set("status", s);
    if (c !== "all") next.set("category", c);
    const qs = next.toString();
    return `/admin/wissen/posts${qs ? `?${qs}` : ""}`;
  }

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
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Artikel</h2>
          <p className="text-muted-foreground">
            {posts.length} {posts.length === 1 ? "Artikel" : "Artikel"} gelistet.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/wissen/posts/new">
            <Plus className="mr-2 h-4 w-4" /> Neuer Artikel
          </Link>
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => (
            <Button
              key={t.id}
              asChild
              size="sm"
              variant={status === t.id ? "default" : "outline"}
            >
              <Link href={buildHref({ status: t.id })}>{t.label}</Link>
            </Button>
          ))}
          <span className="mx-2 h-5 w-px bg-border" aria-hidden="true" />
          <Button
            asChild
            size="sm"
            variant={!categoryFilter ? "default" : "outline"}
          >
            <Link href={buildHref({ category: "all" })}>Alle Kategorien</Link>
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              asChild
              size="sm"
              variant={categoryFilter === c.id ? "default" : "outline"}
            >
              <Link href={buildHref({ category: c.id })}>{c.name}</Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Liste */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Veröffentlicht</TableHead>
                <TableHead>Aktualisiert</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <p className="text-muted-foreground">
                      Noch keine Artikel in dieser Auswahl.
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href="/admin/wissen/posts/new">
                        <Plus className="mr-2 h-3.5 w-3.5" /> Ersten anlegen
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/admin/wissen/posts/${p.id}`}
                        className="font-medium hover:underline line-clamp-2 max-w-md inline-block"
                      >
                        {p.title}
                      </Link>
                      <p
                        className="mt-0.5 text-[11px] text-muted-foreground font-mono"
                        style={{ letterSpacing: "0.02em" }}
                      >
                        /{p.slug}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border",
                          p.publishedAt
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-amber-300 bg-amber-50 text-amber-700",
                        )}
                      >
                        {p.publishedAt ? "Live" : "Entwurf"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.category.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.author.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.publishedAt
                        ? format(new Date(p.publishedAt), "dd.MM.yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(p.updatedAt), "dd.MM.yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {p.publishedAt && (
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            aria-label="Live anschauen"
                          >
                            <a
                              href={`/wissen/${p.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          aria-label="Bearbeiten"
                        >
                          <Link href={`/admin/wissen/posts/${p.id}`}>
                            <PenLine className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
