import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  INVOICE_ORDER_INCLUDE,
  deliverInvoicePdf,
} from "@/lib/invoice/deliver";

// PDF generation is heavy — make sure we never try to run it on the Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orders/[id]/invoice
 *
 * Streams a PDF invoice for the order. Rules:
 *   - user must be logged in and own the order (admins may download any)
 *   - order must be in a billable state (payment SUCCEEDED, or a bank
 *     transfer that has been explicitly marked as paid); PENDING orders
 *     get a 409 so we don't leak fake-legal documents
 *   - invoice number is allocated once and reused on repeat downloads
 *
 * Diese Route deckt NUR Konto-Bestellungen ab. Gast-Bestellungen haben
 * userId=null und wären hier per Definition nie autorisierbar — sie laufen
 * über POST /api/order-status/invoice (Bestellnummer + E-Mail). Alles ab
 * dem Billability-Check teilen sich beide Wege in lib/invoice/deliver.
 */
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
    include: INVOICE_ORDER_INCLUDE,
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 }
    );
  }

  const isOwner = order.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  return deliverInvoicePdf(order);
}
