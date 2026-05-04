import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { writeAuditLog } from "@/lib/admin-audit";

/**
 * POST /api/admin/orders/[id]/refund
 *
 * Triggert einen Stripe-Refund für die Order. Voll- oder Teil-Refund.
 * Der Webhook (`charge.refunded`) macht den Rest:
 *  - Setzt Order.status auf REFUNDED (oder bei Teil: bleibt aktuell)
 *  - Stock-Restore via webhook-Logik
 *  - Schreibt OrderEvent
 *
 * Validierungen vor dem Stripe-Call:
 *  - Auth: ADMIN-Role
 *  - Order existiert + ist Stripe-bezahlt + nicht schon (komplett) refunded
 *  - amountInCents <= verbleibender refundable amount
 *
 * Audit: AdminAuditLog-Eintrag mit { amountInCents, reason }.
 *
 * AUDIT_REPORT_v3 §4.7.
 */

const refundSchema = z.object({
  // Optionaler Betrag in Cents. Wenn nicht gesetzt → Voll-Refund.
  amountInCents: z.number().int().positive().nullish(),
  // Optionaler Grund — landet im Audit-Log + Stripe-Refund-metadata.
  reason: z
    .enum(["duplicate", "fraudulent", "requested_by_customer"])
    .nullish(),
  notes: z.string().max(500).nullish(),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const order = await db.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      stripePaymentIntentId: true,
      paymentStatus: true,
      paymentMethod: true,
      totalInCents: true,
      // Existing OrderEvents mit "refund" im Note-Feld scannen wir
      // nicht — wir vertrauen Stripe als Source of Truth über
      // refunded_amount.
    },
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order nicht gefunden" },
      { status: 404 },
    );
  }

  if (order.paymentMethod !== "STRIPE") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Refund über die Admin-UI nur für Stripe-Bezahlungen — Bank-Transfer manuell zurücküberweisen.",
      },
      { status: 400 },
    );
  }

  if (order.paymentStatus !== "SUCCEEDED") {
    return NextResponse.json(
      {
        success: false,
        error: `Refund nicht möglich: Payment-Status ist "${order.paymentStatus}".`,
      },
      { status: 400 },
    );
  }

  if (!order.stripePaymentIntentId) {
    return NextResponse.json(
      {
        success: false,
        error: "Order hat keine Stripe-PaymentIntent-ID hinterlegt.",
      },
      { status: 400 },
    );
  }

  // Verbleibender refundable amount via Stripe holen — robuster als
  // unsere lokal getrackten OrderEvents.
  const charges = await stripe.charges.list({
    payment_intent: order.stripePaymentIntentId,
    limit: 1,
  });
  const charge = charges.data[0];
  if (!charge) {
    return NextResponse.json(
      {
        success: false,
        error: "Stripe-Charge nicht gefunden zur PaymentIntent.",
      },
      { status: 400 },
    );
  }
  const remaining = charge.amount - charge.amount_refunded;
  if (remaining <= 0) {
    return NextResponse.json(
      { success: false, error: "Order ist bereits vollständig erstattet." },
      { status: 400 },
    );
  }

  const requested = parsed.data.amountInCents ?? remaining;
  if (requested > remaining) {
    return NextResponse.json(
      {
        success: false,
        error: `Maximal ${(remaining / 100).toFixed(2)} € noch erstattbar.`,
      },
      { status: 400 },
    );
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: requested,
      ...(parsed.data.reason ? { reason: parsed.data.reason } : {}),
      metadata: {
        orderNumber: order.orderNumber,
        actorId: session.user.id ?? "",
        actorEmail: session.user.email ?? "",
        ...(parsed.data.notes ? { notes: parsed.data.notes.slice(0, 500) } : {}),
      },
    });

    await writeAuditLog(req, {
      action: "refund",
      entity: "order",
      entityId: order.id,
      payload: {
        orderNumber: order.orderNumber,
        amountInCents: requested,
        remainingBeforeInCents: remaining,
        stripeRefundId: refund.id,
        reason: parsed.data.reason ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        refundId: refund.id,
        amountInCents: requested,
        // Status kann "succeeded", "pending", "failed" oder
        // "requires_action" sein. Webhook übernimmt Final-Update der
        // Order.
        status: refund.status,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refund failed";
    console.error("[admin/refund] stripe.refunds.create failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
