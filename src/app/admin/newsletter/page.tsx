export const dynamic = "force-dynamic";

import { format } from "date-fns";
import { Mail, CheckCircle2, Clock } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
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
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function AdminNewsletterPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const status = params.status ?? "all";
  const skip = (page - 1) * ADMIN_ITEMS_PER_PAGE;

  const where =
    status === "confirmed"
      ? { confirmedAt: { not: null } }
      : status === "pending"
        ? { confirmedAt: null }
        : {};

  const [subscribers, total, confirmedCount, pendingCount] = await Promise.all([
    db.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: ADMIN_ITEMS_PER_PAGE,
    }),
    db.newsletterSubscriber.count({ where }),
    db.newsletterSubscriber.count({ where: { confirmedAt: { not: null } } }),
    db.newsletterSubscriber.count({ where: { confirmedAt: null } }),
  ]);

  const totalPages = Math.ceil(total / ADMIN_ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Newsletter</h2>
        <p className="text-muted-foreground">
          Manage newsletter subscribers
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{confirmedCount + pendingCount}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{confirmedCount}</p>
                <p className="text-xs text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button asChild variant={status === "all" ? "default" : "outline"} size="sm">
          <Link href="/admin/newsletter">All</Link>
        </Button>
        <Button asChild variant={status === "confirmed" ? "default" : "outline"} size="sm">
          <Link href="/admin/newsletter?status=confirmed">Confirmed</Link>
        </Button>
        <Button asChild variant={status === "pending" ? "default" : "outline"} size="sm">
          <Link href="/admin/newsletter?status=pending">Pending</Link>
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead>Confirmed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length > 0 ? (
                subscribers.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.email}</TableCell>
                    <TableCell>
                      {sub.confirmedAt ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Confirmed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(sub.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.confirmedAt
                        ? format(new Date(sub.confirmedAt), "MMM d, yyyy HH:mm")
                        : "\u2014"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">No subscribers yet.</p>
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
            Showing {skip + 1}-{Math.min(skip + ADMIN_ITEMS_PER_PAGE, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/newsletter?page=${page - 1}${status !== "all" ? `&status=${status}` : ""}`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/newsletter?page=${page + 1}${status !== "all" ? `&status=${status}` : ""}`}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
