export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, ExternalLink, PenLine, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function WissenCategoriesListPage() {
  await requireAdmin();

  const categories = await db.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { posts: true } } },
  });

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
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Kategorien
          </h2>
          <p className="text-muted-foreground">
            {categories.length}{" "}
            {categories.length === 1 ? "Kategorie" : "Kategorien"}.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/wissen/categories/new">
            <Plus className="mr-2 h-4 w-4" /> Neue Kategorie
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <p className="text-muted-foreground">
                      Noch keine Kategorien.
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href="/admin/wissen/categories/new">
                        <Plus className="mr-2 h-3.5 w-3.5" /> Erste anlegen
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {c.sortOrder}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/wissen/categories/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1 max-w-md">
                          {c.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {c.slug}
                      </code>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {c._count.posts}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        aria-label="Live anschauen"
                      >
                        <a
                          href={`/wissen/kategorie/${c.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        aria-label="Bearbeiten"
                      >
                        <Link href={`/admin/wissen/categories/${c.id}`}>
                          <PenLine className="h-4 w-4" />
                        </Link>
                      </Button>
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
