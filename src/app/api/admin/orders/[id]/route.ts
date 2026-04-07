import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { updateOrderStatusSchema } from "@/validators/order";

// GET /api/admin/orders/[id] — admin: get order details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
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

  return NextResponse.json({ success: true, data: order });
}

// PATCH /api/admin/orders/[id] — admin: update order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();

  // Handle paymentStatus-only update (Mark as Paid)
  if (body.paymentStatus && !body.status) {
    const existing = await db.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const validPaymentStatuses = ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"];
    if (!validPaymentStatuses.includes(body.paymentStatus)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment status" },
        { status: 400 }
      );
    }

    const order = await db.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        paymentStatus: body.paymentStatus,
      };

      // When marking as paid, also move order to PROCESSING
      if (body.paymentStatus === "SUCCEEDED" && existing.status === "PENDING") {
        updateData.status = "PROCESSING";
      }

      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: { items: true, events: { orderBy: { createdAt: "desc" } } },
      });

      const statusForEvent = updateData.status
        ? (updateData.status as string)
        : existing.status;

      await tx.orderEvent.create({
        data: {
          orderId: id,
          status: statusForEvent as "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED",
          note:
            body.paymentStatus === "SUCCEEDED"
              ? "Payment confirmed (bank transfer received)"
              : `Payment status updated to ${body.paymentStatus}`,
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: order });
  }

  // Standard status update
  const parsed = updateOrderStatusSchema.safeParse({ ...body, orderId: id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const existing = await db.order.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 }
    );
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status };

  if (parsed.data.trackingNumber) {
    updateData.trackingNumber = parsed.data.trackingNumber;
  }

  switch (parsed.data.status) {
    case "SHIPPED":
      updateData.shippedAt = new Date();
      break;
    case "DELIVERED":
      updateData.deliveredAt = new Date();
      break;
    case "CANCELLED":
      updateData.cancelledAt = new Date();
      break;
  }

  const order = await db.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: updateData,
      include: { items: true, events: { orderBy: { createdAt: "desc" } } },
    });

    await tx.orderEvent.create({
      data: {
        orderId: id,
        status: parsed.data.status,
        note: parsed.data.note,
      },
    });

    // Restore stock on cancellation
    if (parsed.data.status === "CANCELLED" && existing.status !== "CANCELLED") {
      for (const item of updated.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    return updated;
  });

  return NextResponse.json({ success: true, data: order });
}
