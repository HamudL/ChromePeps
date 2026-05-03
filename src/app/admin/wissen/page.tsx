export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FileText,
  FolderTree,
  HelpCircle,
  Hash,
  PenLine,
  UserSquare,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Wissen-Admin-Hub: Übersichts-Dashboard mit Counts pro Resource und
 * Schnell-Links zu Sub-Sektionen + den jüngsten Drafts/Edits.
 */
export default async function WissenAdminHub() {
  await requireAdmin();

  const [
    postsTotal,
    postsPublished,
    postsDrafts,
    categoriesCount,
    authorsCount,
    faqCategoriesCount,
    faqItemsCount,
    glossarCount,
    recentPosts,
  ] = await Promise.all([
    db.blogPost.count(),
    db.blogPost.count({ where: { publishedAt: { not: null } } }),
    db.blogPost.count({ where: { publishedAt: null } }),
    db.blogCategory.count(),
    db.author.count(),
    db.fAQCategory.count(),
    db.fAQItem.count(),
    db.glossarTerm.count(),
    db.blogPost.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        category: { select: { name: true } },
        author: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Wissen</h2>
            <p className="text-muted-foreground mt-1">
              Blog-Posts, Kategorien, Autoren, FAQ und Glossar.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/wissen/posts/new">
              <PenLine className="mr-2 h-4 w-4" /> Neuer Artikel
            </Link>
          </Button>
        </div>
      </div>

      {/* Resource-Cards: Counts + Quick-Link */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ResourceCard
          icon={<FileText className="h-5 w-5" />}
          title="Artikel"
          counts={[
            { label: "Veröffentlicht", value: postsPublished },
            { label: "Entwürfe", value: postsDrafts },
          ]}
          href="/admin/wissen/posts"
          accent="primary"
        />
        <ResourceCard
          icon={<FolderTree className="h-5 w-5" />}
          title="Kategorien"
          counts={[{ label: "Gesamt", value: categoriesCount }]}
          href="/admin/wissen/categories"
        />
        <ResourceCard
          icon={<UserSquare className="h-5 w-5" />}
          title="Autoren"
          counts={[{ label: "Gesamt", value: authorsCount }]}
          href="/admin/wissen/authors"
        />
        <ResourceCard
          icon={<HelpCircle className="h-5 w-5" />}
          title="FAQ"
          counts={[
            { label: "Kategorien", value: faqCategoriesCount },
            { label: "Items", value: faqItemsCount },
          ]}
          href="/admin/wissen/faq"
        />
        <ResourceCard
          icon={<Hash className="h-5 w-5" />}
          title="Glossar"
          counts={[{ label: "Begriffe", value: glossarCount }]}
          href="/admin/wissen/glossar"
        />
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5" /> Live-Bereich
            </CardTitle>
            <CardDescription>
              Was hier gepflegt wird, erscheint live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" size="sm" className="w-full justify-between">
              <Link href="/wissen" target="_blank">
                /wissen Hub <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full justify-between">
              <Link href="/wissen/glossar" target="_blank">
                /wissen/glossar <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full justify-between">
              <Link href="/faq" target="_blank">
                /faq <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zuletzt bearbeitet</CardTitle>
          <CardDescription>
            Die {recentPosts.length} jüngsten Artikel-Edits ({postsTotal}{" "}
            Artikel insgesamt).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Titel</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Kategorie</th>
                <th className="px-4 py-2 text-left font-medium">Autor</th>
                <th className="px-4 py-2 text-left font-medium">Aktualisiert</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {recentPosts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Noch keine Artikel.{" "}
                    <Link
                      href="/admin/wissen/posts/new"
                      className="underline hover:text-primary"
                    >
                      Ersten anlegen
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                recentPosts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/wissen/posts/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge published={Boolean(p.publishedAt)} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.category.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.author.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {p.updatedAt.toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/wissen/posts/${p.id}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ArrowRight className="inline-block h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

interface CountDef {
  label: string;
  value: number;
}

function ResourceCard({
  icon,
  title,
  counts,
  href,
  accent = "default",
}: {
  icon: React.ReactNode;
  title: string;
  counts: CountDef[];
  href: string;
  accent?: "default" | "primary";
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span
            className={
              accent === "primary"
                ? "text-primary"
                : "text-muted-foreground"
            }
          >
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-6">
          {counts.map((c) => (
            <div key={c.label}>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">
                {c.value}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
                {c.label}
              </p>
            </div>
          ))}
        </div>
        <Button asChild variant="outline" size="sm" className="mt-4 w-full">
          <Link href={href}>
            Verwalten <ArrowRight className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border border-emerald-300 bg-emerald-50 text-emerald-700">
      Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border border-amber-300 bg-amber-50 text-amber-700">
      Entwurf
    </span>
  );
}
