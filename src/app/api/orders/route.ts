import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/orders — user's orders (paginated)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  const isAdmin = session.user.role === "ADMIN";
  const where = isAdmin ? {} : { userId: session.user.id };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalInCents: true,
        currency: true,
        createdAt: true,
        items: {
          select: { id: true, productName: true, quantity: true },
        },
      },
    }),
    db.order.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      items: orders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
