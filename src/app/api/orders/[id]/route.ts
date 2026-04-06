import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/orders/[id] — user: get own order details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      shippingAddress: true,
      billingAddress: true,
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 }
    );
  }

  // Ownership check (admins can view any order)
  if (order.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: order });
}
