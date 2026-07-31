import "server-only";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrCreateInvoice } from "@/lib/invoice/number";
import { renderInvoicePdf } from "@/lib/invoice/pdf";

/**
 * Gemeinsamer Rechnungs-Auslieferungspfad für alle Aufrufer.
 *
 * Es gibt zwei Wege an dieselbe Rechnung:
 *   - GET  /api/orders/[id]/invoice        — eingeloggter Eigentümer / Admin
 *   - POST /api/order-status/invoice       — Gast, per Bestellnummer + E-Mail
 *
 * Die AUTORISIERUNG unterscheidet sich fundamental und bleibt deshalb in
 * der jeweiligen Route. Alles danach — Billability-Check, Nummernvergabe,
 * Rendering, Header — ist identisch und liegt hier, damit die beiden Wege
 * nicht auseinanderlaufen können (z.B. eine Route den 409 vergisst und
 * Rechnungen für unbezahlte Bestellungen ausliefert).
 */

/**
 * Include-Shape, das `deliverInvoicePdf` erwartet. Als Konstante exportiert,
 * damit beide Routen exakt dieselben Relationen laden — ein fehlendes
 * `invoice` würde sonst still eine zweite Nummer allozieren wollen.
 *
 * `as const` ist hier nicht kosmetisch: `OrderGetPayload` unten leitet die
 * geladenen Relationen aus den Literal-Typen ab. Würde `items: true` zu
 * `boolean` verbreitert, fielen die Relationen aus dem Payload-Typ heraus.
 */
export const INVOICE_ORDER_INCLUDE = {
  items: true,
  billingAddress: true,
  shippingAddress: true,
  user: { select: { name: true, email: true } },
  invoice: true,
} as const satisfies Prisma.OrderInclude;

export type InvoiceOrder = Prisma.OrderGetPayload<{
  include: typeof INVOICE_ORDER_INCLUDE;
}>;

/**
 * Rendert die Rechnung zur übergebenen Order und gibt sie als PDF-Response
 * zurück. Erwartet, dass der Aufrufer die Berechtigung bereits geprüft hat.
 *
 * Liefert 409, solange die Zahlung nicht als eingegangen verbucht ist —
 * eine Rechnung für eine unbezahlte Bestellung wäre ein Beleg über einen
 * Vorgang, der nie stattgefunden hat.
 */
export async function deliverInvoicePdf(
  order: InvoiceOrder
): Promise<NextResponse> {
  if (order.paymentStatus !== "SUCCEEDED") {
    return NextResponse.json(
      {
        success: false,
        error: "Rechnung ist erst nach Zahlungseingang verfügbar.",
      },
      { status: 409 }
    );
  }

  // Nummer einmalig vergeben, bei Wiederholungs-Downloads wiederverwenden.
  const invoice = order.invoice
    ? {
        invoiceNumber: order.invoice.invoiceNumber,
        issuedAt: order.invoice.issuedAt,
      }
    : await getOrCreateInvoice(db, order.id);

  const pdfBuffer = await renderInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issuedAt: invoice.issuedAt,
    orderNumber: order.orderNumber,
    placedAt: order.createdAt,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    // Gast-Orders haben keine User-Relation: Name und E-Mail stehen dann in
    // guestName/guestEmail. Ohne diesen Fallback trüge die Rechnung einer
    // Gastbestellung überhaupt keinen Empfänger (UStG §14 Abs. 4 Nr. 1).
    customerName: order.user?.name ?? order.guestName ?? null,
    customerEmail: order.user?.email ?? order.guestEmail ?? null,
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
