import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { rateLimitExceeded } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import {
  GUEST_LOOKUP_NOT_FOUND,
  guestLookupEmailMatches,
  guestLookupRateLimit,
  parseGuestLookupInput,
} from "@/lib/order/guest-lookup";
import {
  INVOICE_ORDER_INCLUDE,
  deliverInvoicePdf,
} from "@/lib/invoice/deliver";

// PDF-Rendering ist schwer — niemals auf der Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/order-status/invoice
 *
 * Rechnungs-Download für Gäste. Gast-Bestellungen haben userId=null und
 * sind über GET /api/orders/[id]/invoice deshalb prinzipiell nicht
 * erreichbar — ohne diesen Weg käme ein Gast nie an seine Rechnung.
 *
 * Autorisierung identisch zu POST /api/order-status: Bestellnummer UND
 * passende E-Mail, geteiltes Rate-Limit-Budget pro IP, ununterscheidbare
 * 404-Antwort. Siehe lib/order/guest-lookup.
 *
 * POST statt GET, obwohl es ein Download ist: die E-Mail-Adresse gehört
 * nicht in eine URL (Server-Logs, Referer, Browser-History).
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = await guestLookupRateLimit(ip);
  if (!limit.success) return rateLimitExceeded(limit);

  const parsed = parseGuestLookupInput(await parseJsonBody(req));
  if (!parsed.ok) {
    return NextResponse.json(
      { success: false, error: parsed.error },
      { status: 400 }
    );
  }

  const order = await db.order.findUnique({
    where: { orderNumber: parsed.orderNumber },
    include: INVOICE_ORDER_INCLUDE,
  });

  if (!order || !guestLookupEmailMatches(order, parsed.email)) {
    return NextResponse.json(
      { success: false, error: GUEST_LOOKUP_NOT_FOUND },
      { status: 404 }
    );
  }

  return deliverInvoicePdf(order);
}
