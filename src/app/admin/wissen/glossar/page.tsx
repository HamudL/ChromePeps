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

export default async function WissenGlossarListPage() {
  await requireAdmin();

  const terms = await db.glossarTerm.findMany({
    orderBy: { term: "asc" },
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
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Glossar</h2>
          <p className="text-muted-foreground">
            {terms.length}{" "}
            {terms.length === 1 ? "Begriff" : "Begriffe"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a
              href="/wissen/glossar"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Live öffnen
            </a>
          </Button>
          <Button asChild>
            <Link href="/admin/wissen/glossar/new">
              <Plus className="mr-2 h-4 w-4" /> Neuer Begriff
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Begriff</TableHead>
                <TableHead>Akronym</TableHead>
                <TableHead>Definition (kurz)</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <p className="text-muted-foreground">
                      Noch keine Glossar-Begriffe.
                    </p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href="/admin/wissen/glossar/new">
                        <Plus className="mr-2 h-3.5 w-3.5" /> Ersten anlegen
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                terms.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link
                        href={`/admin/wissen/glossar/${t.id}`}
                        className="font-medium hover:underline"
                      >
                        {t.term}
                      </Link>
                      <p
                        className="mt-0.5 text-[11px] text-muted-foreground font-mono"
                        style={{ letterSpacing: "0.02em" }}
                      >
                        {t.slug}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.acronym ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground line-clamp-2 max-w-xl">
                      {t.shortDef}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        aria-label="Live anzeigen"
                      >
                        <a
                          href={`/wissen/glossar#${t.slug}`}
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
                        <Link href={`/admin/wissen/glossar/${t.id}`}>
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
