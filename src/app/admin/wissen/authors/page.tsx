export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, PenLine, Plus } from "lucide-react";
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

export default async function WissenAuthorsListPage() {
  await requireAdmin();

  const authors = await db.author.findMany({
    orderBy: { name: "asc" },
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
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Autoren</h2>
          <p className="text-muted-foreground">
            {authors.length} {authors.length === 1 ? "Autor" : "Autoren"}.
            Bio + ORCID werden in jeden Artikel des Autors automatisch
            übernommen.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/wissen/authors/new">
            <Plus className="mr-2 h-4 w-4" /> Neuer Autor
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Titel</TableHead>
                <TableHead>ORCID</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <p className="text-muted-foreground">
                      Noch keine Autoren.
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href="/admin/wissen/authors/new">
                        <Plus className="mr-2 h-3.5 w-3.5" /> Ersten anlegen
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                authors.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link
                        href={`/admin/wissen/authors/${a.id}`}
                        className="font-medium hover:underline"
                      >
                        {a.name}
                      </Link>
                      <p
                        className="mt-0.5 text-[11px] text-muted-foreground font-mono"
                        style={{ letterSpacing: "0.02em" }}
                      >
                        {a.slug}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.title ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {a.orcid ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {a._count.posts}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        aria-label="Bearbeiten"
                      >
                        <Link href={`/admin/wissen/authors/${a.id}`}>
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
