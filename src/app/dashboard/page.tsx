export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Package } from "lucide-react";

const PAGE_SIZE = 10;

export default async function DashboardOrdersPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireAuth();
  const searchParams = await props.searchParams;
  const currentPage = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const skip = (currentPage - 1) * PAGE_SIZE;

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        items: {
          select: {
            id: true,
            productName: true,
            quantity: true,
          },
        },
      },
    }),
    db.order.count({ where: { userId: session.user.id } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (orders.length === 0 && currentPage === 1) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/50">
            <Package className="h-7 w-7 text-muted-foreground" />
          </div>
          <span className="eyebrow justify-center">Bestellungen</span>
          <h2 className="display-title mt-2 mb-2 text-xl">Noch keine Bestellungen</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Sobald Sie eine Bestellung aufgeben, erscheint sie hier.
          </p>
          <Button variant="gold" asChild>
            <Link href="/products">Produkte entdecken</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <span className="eyebrow">Verlauf</span>
          <CardTitle className="display-title mt-2 text-xl">Meine Bestellungen</CardTitle>
          <CardDescription>
            {total === 1 ? "1 Bestellung" : `${total} Bestellungen`} insgesamt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em]">Bestellnr.</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em]">Datum</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em]">Status</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.12em]">Positionen</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.12em]">Gesamt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="group">
                    <TableCell>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-mono font-medium text-primary-strong underline-offset-4 group-hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {format(new Date(order.createdAt), "dd.MM.yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={ORDER_STATUS_COLORS[order.status] ?? ""}
                      >
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.items.length === 1
                        ? order.items[0].productName
                        : `${order.items.length} Positionen`}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatPrice(order.totalInCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Seite {currentPage} von {totalPages}
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard?page=${currentPage - 1}`}>
                      Zurück
                    </Link>
                  </Button>
                )}
                {currentPage < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard?page=${currentPage + 1}`}>
                      Weiter
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
