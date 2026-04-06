export const dynamic = "force-dynamic";

import Link from "next/link";
import { format } from "date-fns";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  ArrowRight,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatPrice, cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RevenueChart } from "@/components/admin/revenue-chart";

async function getDashboardStats() {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  const [
    totalRevenue,
    totalOrders,
    totalProducts,
    totalUsers,
    recentOrders,
    ordersByStatus,
    monthlyRevenue,
  ] = await Promise.all([
    db.order.aggregate({
      where: { paymentStatus: "SUCCEEDED" },
      _sum: { totalInCents: true },
    }),
    db.order.count(),
    db.product.count({ where: { isActive: true } }),
    db.user.count(),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { id: true, productName: true, quantity: true } },
      },
    }),
    db.order.groupBy({
      by: ["status"],
      _count: true,
    }),
    db.order.findMany({
      where: {
        paymentStatus: "SUCCEEDED",
        createdAt: { gte: twelveMonthsAgo },
      },
      select: { totalInCents: true, createdAt: true },
    }),
  ]);

  const revenueByMonth: Record<string, number> = {};
  for (const order of monthlyRevenue) {
    const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, "0")}`;
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + order.totalInCents;
  }

  return {
    totalRevenue: totalRevenue._sum.totalInCents ?? 0,
    totalOrders,
    totalProducts,
    totalUsers,
    recentOrders,
    revenueByMonth: Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue })),
    ordersByStatus: ordersByStatus.map((g) => ({
      status: g.status,
      count: g._count,
    })),
  };
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const stats = await getDashboardStats();

  const statCards = [
    {
      title: "Total Revenue",
      value: formatPrice(stats.totalRevenue),
      icon: DollarSign,
      description: "Lifetime revenue from paid orders",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      description: "All orders placed",
    },
    {
      title: "Active Products",
      value: stats.totalProducts.toLocaleString(),
      icon: Package,
      description: "Products in catalog",
    },
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      description: "Registered accounts",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your store performance.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Monthly revenue over the past 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.revenueByMonth.length > 0 ? (
              <RevenueChart data={stats.revenueByMonth} />
            ) : (
              <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                No revenue data yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Distribution of current orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.ordersByStatus.length > 0 ? (
                stats.ordersByStatus.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          ORDER_STATUS_COLORS[item.status]
                        )}
                      >
                        {ORDER_STATUS_LABELS[item.status] ?? item.status}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              )}
              {stats.totalOrders > 0 && (
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-sm font-bold">
                    {stats.totalOrders}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest 5 orders</CardDescription>
          </div>
          <Link
            href="/admin/orders"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recentOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.map((order) => (
                  <TableRow key={order.id}>
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
                      {format(new Date(order.createdAt), "MMM d, yyyy")}
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
                    <TableCell className="text-right font-medium">
                      {formatPrice(order.totalInCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No orders yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
