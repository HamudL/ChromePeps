import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { updateOrderStatusSchema } from "@/validators/order";
import {
  sendOrderShippedEmail,
  sendReviewRequestEmail,
} from "@/lib/mail/send";

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

  // Handle isTestOrder-only toggle (mark/unmark test order). Kein Status-Wechsel,
  // keine Mails — reine Metadaten-Änderung.
  if (typeof body.isTestOrder === "boolean" && !body.status && !body.paymentStatus) {
    const existing = await db.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const order = await db.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { isTestOrder: body.isTestOrder },
        include: { items: true, events: { orderBy: { createdAt: "desc" } } },
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          status: existing.status,
          note: body.isTestOrder
            ? "Als Testbestellung markiert"
            : "Testbestellung-Kennzeichnung entfernt",
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: order });
  }

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

    // Restore stock on cancellation — nur unter strengen Bedingungen:
    //  1) Test-Orders haben nie Stock dekrementiert (siehe
    //     /api/admin/orders/test) → dürfen auch nichts re-incrementen
    //     (sonst phantom inventory pro gecancelter Test-Order).
    //  2) Stock wurde nur bei echten Kauf-Status-Übergängen
    //     (PROCESSING / SHIPPED) dekrementiert. Transitions wie
    //     ARCHIVED → CANCELLED oder DELIVERED → CANCELLED würden
    //     ohne diesen Guard doppelt oder fälschlich re-incrementen
    //     (ARCHIVED hatte meist schon einen restore hinter sich,
    //     DELIVERED ist die Ware bereits beim Kunden).
    //  3) `.catch(() => {})` bleibt, falls product/variant
    //     hard-deleted wurde.
    const stockWasDecremented = (
      ["PROCESSING", "SHIPPED"] as const
    ).includes(existing.status as "PROCESSING" | "SHIPPED");
    if (
      parsed.data.status === "CANCELLED" &&
      stockWasDecremented &&
      !existing.isTestOrder
    ) {
      for (const item of updated.items) {
        if (item.variantId) {
          await tx.productVariant
            .update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            })
            .catch(() => {});
        } else if (item.productId) {
          await tx.product
            .update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
            .catch(() => {});
        }
      }
    }

    return updated;
  });

  // Transactional mails — trigger on legitimate forward transitions only.
  // Never block on mail failures; the status update is already committed.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const becameShipped =
    parsed.data.status === "SHIPPED" && existing.status !== "SHIPPED";
  const becameDelivered =
    parsed.data.status === "DELIVERED" && existing.status !== "DELIVERED";

  if (becameShipped || becameDelivered) {
    try {
      const fullOrder = await db.order.findUnique({
        where: { id },
        include: {
          user: { select: { email: true, name: true } },
          items: { include: { product: { select: { slug: true } } } },
          shippingAddress: true,
        },
      });

      // Test-Orders bekommen NIE eine Mail — sie existieren nur, damit Admin
      // den Fulfillment-Flow durchspielen kann, ohne echten Empfänger zu
      // belasten. Früher Exit vor sendOrder*Email-Aufrufen.
      if (fullOrder?.isTestOrder) {
        // noop — status update stays, but we skip transactional mail.
      } else if (fullOrder?.user?.email) {
        if (becameShipped) {
          await sendOrderShippedEmail({
            to: fullOrder.user.email,
            customerName: fullOrder.user.name,
            orderNumber: fullOrder.orderNumber,
            orderUrl: baseUrl
              ? `${baseUrl}/dashboard/orders/${fullOrder.id}`
              : undefined,
            shippedAt: fullOrder.shippedAt ?? new Date(),
            trackingNumber: fullOrder.trackingNumber,
            trackingUrl: null,
            items: fullOrder.items.map((item) => ({
              name: item.productName,
              variant: item.variantName,
              sku: item.sku,
              quantity: item.quantity,
            })),
            shippingAddress: fullOrder.shippingAddress
              ? {
                  firstName: fullOrder.shippingAddress.firstName,
                  lastName: fullOrder.shippingAddress.lastName,
                  company: fullOrder.shippingAddress.company,
                  street: fullOrder.shippingAddress.street,
                  street2: fullOrder.shippingAddress.street2,
                  postalCode: fullOrder.shippingAddress.postalCode,
                  city: fullOrder.shippingAddress.city,
                  country: fullOrder.shippingAddress.country,
                }
              : null,
          });
        }

        if (becameDelivered) {
          // De-dupe by product id — customers don't need multiple review
          // buttons for variants of the same product.
          const seen = new Set<string>();
          const products = fullOrder.items
            .filter((item) => {
              if (!item.productId) return false;
              if (seen.has(item.productId)) return false;
              seen.add(item.productId);
              return true;
            })
            .map((item) => {
              const slug = item.product?.slug;
              const reviewUrl =
                baseUrl && slug
                  ? `${baseUrl}/products/${slug}#reviews`
                  : baseUrl || "#";
              return {
                name: item.productName,
                variant: item.variantName,
                reviewUrl,
              };
            });

          if (products.length > 0) {
            await sendReviewRequestEmail({
              to: fullOrder.user.email,
              customerName: fullOrder.user.name,
              orderNumber: fullOrder.orderNumber,
              products,
            });
          }
        }
      }
    } catch (err) {
      console.error(
        "[admin/orders] transactional mail failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  return NextResponse.json({ success: true, data: order });
}

// DELETE /api/admin/orders/[id] — admin: soft-delete (archive) an order
export async function DELETE(
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

  const existing = await db.order.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 }
    );
  }

  // Only allow archiving of terminal states
  const archivableStatuses = ["CANCELLED", "DELIVERED", "REFUNDED"];
  if (!archivableStatuses.includes(existing.status)) {
    return NextResponse.json(
      {
        success: false,
        error: "Only cancelled, delivered, or refunded orders can be archived.",
      },
      { status: 400 }
    );
  }

  const order = await db.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await tx.orderEvent.create({
      data: {
        orderId: id,
        status: "ARCHIVED",
        note: "Order archived by admin",
      },
    });

    return updated;
  });

  return NextResponse.json({ success: true, data: order });
}
