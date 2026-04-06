export const dynamic = "force-dynamic";

import Link from "next/link";
import { format } from "date-fns";
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
import type { Prisma } from "@prisma/client";

const STATUSES = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const statusFilter = params.status ?? "ALL";
  const skip = (page - 1) * ADMIN_ITEMS_PER_PAGE;

  const where: Prisma.OrderWhereInput =
    statusFilter !== "ALL"
      ? { status: statusFilter as Prisma.EnumOrderStatusFilter }
      : {};

  const [orders, total] = await Promise.all([
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
  ]);

  const totalPages = Math.ceil(total / ADMIN_ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
        <p className="text-muted-foreground">
          Manage customer orders ({total} total)
        </p>
      </div>

      {/* Status Filter Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <Button
                key={s}
                asChild
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
              >
                <Link
                  href={`/admin/orders${s !== "ALL" ? `?status=${s}` : ""}`}
                >
                  {s === "ALL" ? "All" : ORDER_STATUS_LABELS[s] ?? s}
                </Link>
              </Button>
            ))}
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
                          {order.user.name ?? "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          ORDER_STATUS_COLORS[order.status]
                        )}
                      >
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
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
                <Link
                  href={`/admin/orders?page=${page - 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/orders?page=${page + 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`}
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
