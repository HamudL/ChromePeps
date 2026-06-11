import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { invalidateStockCaches } from "@/lib/order/invalidate-stock-caches";
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

  // Restore stock on cancellation — nur unter strengen Bedingungen:
  //  1) Test-Orders haben nie Stock dekrementiert (siehe
  //     /api/admin/orders/test) → dürfen auch nichts re-incrementen
  //     (sonst phantom inventory pro gecancelter Test-Order).
  //  2) Stock wird bei JEDER echten Order schon bei der Erstellung
  //     dekrementiert — Stripe-Orders entstehen direkt als
  //     PROCESSING, Vorkasse-Orders als PENDING (Reservierung bis
  //     Zahlungseingang). Cancel aus PENDING/PROCESSING/SHIPPED muss
  //     daher restauren. NICHT aus DELIVERED (Ware beim Kunden) und
  //     nicht aus terminalen Status (CANCELLED/REFUNDED/ARCHIVED —
  //     dort ist der Bestand bereits zurückgebucht).
  //  3) stockRestoredAt schützt zusätzlich gegen Doppel-Restore bei
  //     Status-Flapping (CANCELLED → PROCESSING → CANCELLED) und
  //     gegen Refund-nach-Cancel (Webhook prüft dasselbe Feld).
  //  4) `.catch(() => {})` bleibt, falls product/variant
  //     hard-deleted wurde.
  // Vor die Transaction gehoben (alle Inputs sind Pre-TX-State), damit
  // dieselbe Bedingung nach dem Commit die Cache-Invalidierung steuert.
  const stockWasDecremented = (
    ["PENDING", "PROCESSING", "SHIPPED"] as const
  ).includes(existing.status as "PENDING" | "PROCESSING" | "SHIPPED");
  const willRestoreStock =
    parsed.data.status === "CANCELLED" &&
    stockWasDecremented &&
    !existing.isTestOrder &&
    !existing.stockRestoredAt;
  // Marker direkt ins Status-Update falten (statt zweitem update auf
  // derselben Row) — Status + Restore-Marker werden atomar in EINEM
  // Statement gesetzt, gleiches Muster wie der Refund-Pfad im Webhook.
  if (willRestoreStock) {
    updateData.stockRestoredAt = new Date();
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

    if (willRestoreStock) {
      // Stock-Restore parallelisieren: zwar führt Postgres bei einer
      // interactive transaction die Statements seriell auf derselben
      // Connection aus, der Client-Side-Overhead (Statement-Encoding,
      // Pipeline-Sending) wird aber durch Promise.all gebündelt. Bei
      // 5+ Items spürbarer Latency-Gewinn ohne Semantik-Drift —
      // jeder Update bleibt einzeln catch-isoliert (Variant/Product
      // hard-deleted? → Item überspringen, andere weiter restoren).
      await Promise.all(
        updated.items.map((item) => {
          if (item.variantId) {
            return tx.productVariant
              .update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              })
              .catch(() => {});
          }
          if (item.productId) {
            return tx.product
              .update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              })
              .catch(() => {});
          }
          return Promise.resolve();
        }),
      );
    }

    // Promo-Kontingent freigeben, wenn eine UNBEZAHLTE Vorkasse-Order
    // gecancelt wird: die Einlösung wurde bei Bestellaufgabe reserviert,
    // ohne dass je Geld floss — sonst bliebe der Code für den Käufer
    // dauerhaft verbrannt und das globale maxUses-Budget verbraucht.
    // Bezahlte Orders behalten ihre Einlösung (Rabatt wurde gewährt).
    if (
      parsed.data.status === "CANCELLED" &&
      existing.paymentMethod === "BANK_TRANSFER" &&
      existing.paymentStatus === "PENDING"
    ) {
      const usage = await tx.promoUsage.findUnique({
        where: { orderId: id },
        select: { id: true, promoId: true },
      });
      if (usage) {
        await tx.promoUsage.delete({ where: { id: usage.id } });
        await tx.promoCode.updateMany({
          where: { id: usage.promoId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
        await tx.orderEvent.create({
          data: {
            orderId: id,
            status: "CANCELLED",
            note: "Promo-Einlösung freigegeben (Vorkasse-Order ohne Zahlungseingang storniert).",
          },
        });
      }
    }

    return updated;
  });

  // Stock-Restore macht ggf. ein "Ausverkauft"-Produkt wieder verfügbar —
  // ohne Invalidierung sähe der Shop das erst nach TTL-Ablauf. Fail-safe
  // (Redis-Fehler werden intern geschluckt) — der Status-Update ist zu
  // diesem Zeitpunkt bereits committed und bleibt es auch.
  if (willRestoreStock) {
    await invalidateStockCaches();
  }

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
      } else if (fullOrder) {
        // Empfänger auflösen: Account-Orders über die User-Relation,
        // Gast-Orders (userId null) über guestEmail/guestName — vorher
        // gingen Gäste bei Versand-/Liefer-Mails komplett leer aus.
        const recipientEmail = fullOrder.user?.email ?? fullOrder.guestEmail;
        const recipientName = fullOrder.user?.name ?? fullOrder.guestName;
        const isGuest = !fullOrder.user?.email;

        if (recipientEmail && becameShipped) {
          await sendOrderShippedEmail({
            to: recipientEmail,
            customerName: recipientName,
            orderNumber: fullOrder.orderNumber,
            // Gäste haben kein Dashboard — sie bekommen den öffentlichen
            // Order-Status-Link (gleiche URL-Form wie in der
            // Bestellbestätigung, siehe stripe/webhook + bank-transfer).
            orderUrl: baseUrl
              ? isGuest
                ? `${baseUrl}/order-status?orderNumber=${encodeURIComponent(
                    fullOrder.orderNumber
                  )}&email=${encodeURIComponent(recipientEmail)}`
                : `${baseUrl}/dashboard/orders/${fullOrder.id}`
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

        // Review-Request NUR an eingeloggte Kunden: /api/reviews POST
        // verlangt Session + Verified-Purchase über die userId — ein Gast
        // würde dem Link nur in eine Login-Sackgasse folgen.
        if (becameDelivered && fullOrder.user?.email) {
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
            // Idempotenz-Marker setzen, damit der nightly Cron
            // (/api/cron/review-requests) diese Order nicht nochmal
            // erfasst. Best-effort — wenn der UPDATE failed (z.B.
            // gleichzeitiger Cron-Run), schickt der Cron eine zweite
            // Mail, was auf jeden Fall noch dem Status quo entspricht.
            try {
              await db.order.update({
                where: { id: fullOrder.id },
                data: { reviewRequestedAt: new Date() },
              });
            } catch (err) {
              console.warn(
                "[admin/orders] reviewRequestedAt update failed:",
                err instanceof Error ? err.message : err,
              );
            }
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
