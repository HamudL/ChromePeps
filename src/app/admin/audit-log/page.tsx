export const dynamic = "force-dynamic";

import Link from "next/link";
import { format } from "date-fns";
import { Activity, Search, User, FileText } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Admin-Audit-Log View. Read-only Tabelle aller AdminAuditLog-Zeilen
 * mit Filter nach action / entity / actor.
 *
 * Pagination wie /admin/users (50 pro Seite). Search-Form ist GET ->
 * Server reads searchParams.
 *
 * AUDIT_REPORT_v3 §4.14.
 */

interface Props {
  searchParams: Promise<{
    page?: string;
    action?: string;
    entity?: string;
    actor?: string;
  }>;
}

const ACTION_COLORS: Record<string, string> = {
  refund: "border-rose-300 text-rose-700",
  delete: "border-red-300 text-red-700",
  create: "border-emerald-300 text-emerald-700",
  update: "border-blue-300 text-blue-700",
  publish: "border-amber-300 text-amber-700",
  archive: "border-zinc-300 text-zinc-700",
};

const ENTITY_LABELS: Record<string, string> = {
  order: "Order",
  product: "Product",
  blog_post: "Blog-Post",
  promo: "Promo-Code",
  user: "User",
};

export default async function AdminAuditLogPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const skip = (page - 1) * ADMIN_ITEMS_PER_PAGE;

  // "all" ist der Default-Select-Wert wenn kein Filter aktiv ist —
  // ignorieren wir genauso wie ein leeres String. Damit bleibt der
  // shadcn-Select kontrolliert (er mag keinen leeren initialValue).
  const actionFilter =
    params.action && params.action !== "all" ? params.action : null;
  const entityFilter =
    params.entity && params.entity !== "all" ? params.entity : null;
  const actorFilter = params.actor?.trim() || null;

  const where = {
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(entityFilter ? { entity: entityFilter } : {}),
    ...(actorFilter
      ? {
          OR: [
            { actorEmail: { contains: actorFilter, mode: "insensitive" as const } },
            { actorId: actorFilter },
          ],
        }
      : {}),
  };

  const [entries, total, distinctActions, distinctEntities] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: ADMIN_ITEMS_PER_PAGE,
    }),
    db.adminAuditLog.count({ where }),
    // Filter-Optionen aus dem aktuellen Datenbestand. Begrenzt damit
    // wir bei Mass-Logs die Page nicht crashen.
    db.adminAuditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      take: 50,
      orderBy: { action: "asc" },
    }),
    db.adminAuditLog.findMany({
      distinct: ["entity"],
      select: { entity: true },
      take: 50,
      orderBy: { entity: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / ADMIN_ITEMS_PER_PAGE);

  function buildPageHref(targetPage: number): string {
    const sp = new URLSearchParams();
    sp.set("page", String(targetPage));
    if (actionFilter) sp.set("action", actionFilter);
    if (entityFilter) sp.set("entity", entityFilter);
    if (actorFilter) sp.set("actor", actorFilter);
    return `/admin/audit-log?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Audit-Log
          </h2>
          <p className="text-muted-foreground">
            Alle Admin-Aktionen mit Actor, Entity und Payload-Snapshot ({total}{" "}
            Einträge).
          </p>
        </div>
      </div>

      {/* Filter-Form */}
      <Card>
        <CardContent className="pt-6">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Action
              </label>
              <Select name="action" defaultValue={params.action ?? "all"}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Actions</SelectItem>
                  {distinctActions.map((row) => (
                    <SelectItem key={row.action} value={row.action}>
                      {row.action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Entity
              </label>
              <Select name="entity" defaultValue={params.entity ?? "all"}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Entities</SelectItem>
                  {distinctEntities.map((row) => (
                    <SelectItem key={row.entity} value={row.entity}>
                      {ENTITY_LABELS[row.entity] ?? row.entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Actor (Email oder ID)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="actor"
                  placeholder="actor@example.com"
                  defaultValue={params.actor ?? ""}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary" className="flex-1">
                Filtern
              </Button>
              {(actionFilter || entityFilter || actorFilter) && (
                <Button asChild variant="ghost">
                  <Link href="/admin/audit-log">Reset</Link>
                </Button>
              )}
            </div>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Hinweis: leere Select-Werte (&bdquo;Alle&ldquo;) werden vom Server
            ignoriert &mdash; einfach Filter abschicken.
          </p>
        </CardContent>
      </Card>

      {/* Tabelle */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wann</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length > 0 ? (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {format(
                        new Date(entry.createdAt),
                        "dd.MM.yyyy HH:mm:ss",
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium leading-tight">
                            {entry.actorEmail ?? "—"}
                          </p>
                          {entry.actorId && (
                            <code className="text-[10px] text-muted-foreground">
                              {entry.actorId.slice(0, 12)}…
                            </code>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          ACTION_COLORS[entry.action] ??
                          "border-zinc-300 text-zinc-700"
                        }
                      >
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="text-sm">
                          <span className="font-medium">
                            {ENTITY_LABELS[entry.entity] ?? entry.entity}
                          </span>
                          <code className="ml-1.5 text-[10px] text-muted-foreground">
                            {entry.entityId.slice(0, 12)}…
                          </code>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      {entry.payload ? (
                        <pre className="overflow-auto rounded bg-muted px-2 py-1 text-[11px] leading-snug">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                      {entry.ipAddress && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          IP {entry.ipAddress}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">
                      Keine Einträge — entweder noch nichts protokolliert oder
                      der Filter ist zu eng.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Zeige {skip + 1}–{Math.min(skip + ADMIN_ITEMS_PER_PAGE, total)} von{" "}
            {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildPageHref(page - 1)}>Vorherige</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildPageHref(page + 1)}>Nächste</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
