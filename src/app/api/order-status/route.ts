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

/**
 * POST /api/order-status
 *
 * Public order-status lookup. Used mainly by guest shoppers who
 * don't have an account and need to check their order — the
 * confirmation email includes a link here with the order number
 * and email prefilled.
 *
 * Authorization is two-factor: the caller must supply BOTH the
 * order number AND the matching email address. The email is
 * compared (case-insensitive) against either `guestEmail` on the
 * order or `user.email` if the order is linked to an account.
 *
 * Rate-limited aggressively by IP to make order-number enumeration
 * unattractive. Order numbers are `CP-<ts36>-<rand8hex>` so there's
 * already a reasonable keyspace, but we don't want to rely on that
 * alone.
 */

type OrderStatusResponse = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  placedAt: string;
  subtotalInCents: number;
  shippingInCents: number;
  taxInCents: number;
  discountInCents: number;
  totalInCents: number;
  promoCode: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: Array<{
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    priceInCents: number;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company: string | null;
    street: string;
    street2: string | null;
    postalCode: string;
    city: string;
    country: string;
  } | null;
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = await guestLookupRateLimit(ip);
  if (!limit.success) return rateLimitExceeded(limit);

  // Kaputtes JSON → leeres Objekt → 400, statt unbehandelter 500.
  const parsed = parseGuestLookupInput(await parseJsonBody(req));
  if (!parsed.ok) {
    return NextResponse.json(
      { success: false, error: parsed.error },
      { status: 400 }
    );
  }

  const order = await db.order.findUnique({
    where: { orderNumber: parsed.orderNumber },
    include: {
      user: { select: { email: true } },
      items: {
        select: {
          productName: true,
          variantName: true,
          sku: true,
          quantity: true,
          priceInCents: true,
        },
      },
      shippingAddress: {
        select: {
          firstName: true,
          lastName: true,
          company: true,
          street: true,
          street2: true,
          postalCode: true,
          city: true,
          country: true,
        },
      },
    },
  });

  // Immer dieselbe "nicht gefunden"-Meldung, egal ob die Bestellnummer
  // unbekannt ist oder nur die E-Mail nicht passt — sonst wird der
  // Endpunkt zum Orakel dafür, welche Bestellnummern existieren.
  if (!order || !guestLookupEmailMatches(order, parsed.email)) {
    return NextResponse.json(
      { success: false, error: GUEST_LOOKUP_NOT_FOUND },
      { status: 404 }
    );
  }

  const payload: OrderStatusResponse = {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    placedAt: order.createdAt.toISOString(),
    subtotalInCents: order.subtotalInCents,
    shippingInCents: order.shippingInCents,
    taxInCents: order.taxInCents,
    discountInCents: order.discountInCents,
    totalInCents: order.totalInCents,
    promoCode: order.promoCode,
    trackingNumber: order.trackingNumber,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    items: order.items,
    shippingAddress: order.shippingAddress,
  };

  return NextResponse.json({ success: true, data: payload });
}
