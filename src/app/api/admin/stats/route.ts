import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/constants";

// GET /api/admin/stats — admin dashboard stats
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const cached = await cacheGet(CACHE_KEYS.STATS);
  if (cached) {
    return NextResponse.json({ success: true, data: cached });
  }

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
    // Total revenue (only succeeded payments)
    db.order.aggregate({
      where: { paymentStatus: "SUCCEEDED" },
      _sum: { totalInCents: true },
    }),

    db.order.count(),
    db.product.count({ where: { isActive: true } }),
    db.user.count(),

    // Recent orders
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalInCents: true,
        currency: true,
        createdAt: true,
        items: { select: { id: true, productName: true, quantity: true } },
      },
    }),

    // Orders grouped by status
    db.order.groupBy({
      by: ["status"],
      _count: true,
    }),

    // Revenue by month (last 12 months)
    db.order.findMany({
      where: {
        paymentStatus: "SUCCEEDED",
        createdAt: { gte: twelveMonthsAgo },
      },
      select: { totalInCents: true, createdAt: true },
    }),
  ]);

  // Aggregate monthly revenue
  const revenueByMonth: Record<string, number> = {};
  for (const order of monthlyRevenue) {
    const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, "0")}`;
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + order.totalInCents;
  }

  const stats = {
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

  await cacheSet(CACHE_KEYS.STATS, stats, CACHE_TTL.STATS);

  return NextResponse.json({ success: true, data: stats });
}
