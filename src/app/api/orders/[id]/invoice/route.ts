import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateInvoice } from "@/lib/invoice/number";
import { renderInvoicePdf } from "@/lib/invoice/pdf";

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
    include: {
      items: true,
      billingAddress: true,
      shippingAddress: true,
      user: { select: { name: true, email: true } },
      invoice: true,
    },
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

  if (order.paymentStatus !== "SUCCEEDED") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Rechnung ist erst nach Zahlungseingang verf\u00fcgbar.",
      },
      { status: 409 }
    );
  }

  // Allocate (or reuse) the invoice number.
  const invoice = order.invoice
    ? {
        invoiceNumber: order.invoice.invoiceNumber,
        issuedAt: order.invoice.issuedAt,
      }
    : await getOrCreateInvoice(db, order.id);

  // Render the PDF buffer.
  const pdfBuffer = await renderInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issuedAt: invoice.issuedAt,
    orderNumber: order.orderNumber,
    placedAt: order.createdAt,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    customerName: order.user?.name ?? null,
    customerEmail: order.user?.email ?? null,
    billingAddress: order.billingAddress ?? order.shippingAddress ?? null,
    items: order.items.map((item) => ({
      name: item.productName,
      variant: item.variantName,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceInCents: item.priceInCents,
    })),
    subtotalInCents: order.subtotalInCents,
    discountInCents: order.discountInCents,
    shippingInCents: order.shippingInCents,
    taxInCents: order.taxInCents,
    totalInCents: order.totalInCents,
    promoCode: order.promoCode,
  });

  const filename = `Rechnung-${invoice.invoiceNumber}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(pdfBuffer.byteLength),
    },
  });
}
