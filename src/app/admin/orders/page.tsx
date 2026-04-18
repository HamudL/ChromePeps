export const dynamic = "force-dynamic";

import Link from "next/link";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatPrice, cn } from "@/lib/utils";
import {
  ADMIN_ITEMS_PER_PAGE,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
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
import { TestOrderCreateDialog } from "@/components/admin/test-order-create-dialog";
import type { Prisma } from "@prisma/client";

const STATUSES = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "ARCHIVED",
] as const;

interface Props {
  searchParams: Promise<{ page?: string; status?: string; showTest?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const statusFilter = params.status ?? "ALL";
  const showTest = params.showTest === "1";
  const skip = (page - 1) * ADMIN_ITEMS_PER_PAGE;

  const where: Prisma.OrderWhereInput = {
    ...(statusFilter !== "ALL"
      ? { status: statusFilter as Prisma.EnumOrderStatusFilter }
      : { status: { not: "ARCHIVED" } }),
    // Testbestellungen werden standardmäßig ausgeblendet. Admin kann per
    // Toggle einblenden, um Test-Orders gezielt zu prüfen.
    ...(showTest ? {} : { isTestOrder: false }),
  };

  const [orders, total, catalogProducts] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: ADMIN_ITEMS_PER_PAGE,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    db.order.count({ where }),
    // Preload für den "Test-Order anlegen"-Dialog — eine kompakte Liste
    // aktiver Produkte inkl. Varianten. Kein paging nötig; der Dialog
    // macht clientseitige Textsuche.
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 200,
      select: {
        id: true,
        name: true,
        sku: true,
        priceInCents: true,
        variants: {
          where: { isActive: true },
          select: { id: true, name: true, priceInCents: true },
          orderBy: { priceInCents: "asc" },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / ADMIN_ITEMS_PER_PAGE);

  const exportParts: string[] = [];
  if (statusFilter !== "ALL") exportParts.push(`status=${statusFilter}`);
  if (showTest) exportParts.push("includeTest=true");
  const exportHref = `/api/admin/orders/export${
    exportParts.length > 0 ? `?${exportParts.join("&")}` : ""
  }`;

  function buildOrdersHref(overrides: {
    status?: string;
    page?: number;
    showTest?: boolean;
  }): string {
    const next = new URLSearchParams();
    const status = overrides.status ?? statusFilter;
    if (status && status !== "ALL") next.set("status", status);
    const pageNext = overrides.page;
    if (pageNext && pageNext > 1) next.set("page", String(pageNext));
    const showTestNext = overrides.showTest ?? showTest;
    if (showTestNext) next.set("showTest", "1");
    const qs = next.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">
            Manage customer orders ({total} total)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TestOrderCreateDialog products={catalogProducts} />
          <Button asChild variant="outline" size="sm">
            <a href={exportHref}>
              <Download className="mr-2 h-4 w-4" />
              CSV exportieren
            </a>
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-2">
            {STATUSES.map((s) => (
              <Button
                key={s}
                asChild
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
              >
                <Link href={buildOrdersHref({ status: s, page: 1 })}>
                  {s === "ALL" ? "All" : ORDER_STATUS_LABELS[s] ?? s}
                </Link>
              </Button>
            ))}
            <div className="ml-auto">
              <Button
                asChild
                variant={showTest ? "default" : "outline"}
                size="sm"
              >
                <Link
                  href={buildOrdersHref({ showTest: !showTest, page: 1 })}
                  title={
                    showTest
                      ? "Testbestellungen werden aktuell angezeigt — klicken zum Ausblenden"
                      : "Testbestellungen einblenden (standardmäßig versteckt)"
                  }
                >
                  {showTest ? "Test-Orders sichtbar" : "Test-Orders einblenden"}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {order.user?.name ?? order.guestName ?? "N/A"}
                          {!order.user && (
                            <span className="ml-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                              · Gast
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.user?.email ?? order.guestEmail ?? "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            ORDER_STATUS_COLORS[order.status]
                          )}
                        >
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                        {order.isTestOrder && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold uppercase tracking-wider border-amber-400 text-amber-700 bg-amber-50"
                            title="Testbestellung — nicht in Statistiken/Exports enthalten"
                          >
                            Test
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          order.paymentStatus === "SUCCEEDED"
                            ? "border-green-300 text-green-700"
                            : order.paymentStatus === "FAILED"
                              ? "border-red-300 text-red-700"
                              : "border-yellow-300 text-yellow-700"
                        )}
                      >
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(order.totalInCents)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {statusFilter !== "ALL"
                        ? `No ${ORDER_STATUS_LABELS[statusFilter]?.toLowerCase() ?? statusFilter.toLowerCase()} orders.`
                        : "No orders yet."}
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
            Showing {skip + 1}-{Math.min(skip + ADMIN_ITEMS_PER_PAGE, total)} of{" "}
            {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildOrdersHref({ page: page - 1 })}>Previous</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildOrdersHref({ page: page + 1 })}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
