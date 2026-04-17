import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";

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
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0].trim() ?? "unknown";
  // 10 tries per 5-minute window per IP. Enough for a legitimate
  // user who mis-types their email a few times, tight enough to
  // make enumeration impractical at scale.
  const limit = await rateLimit(`order-status:ip:${ip}`, {
    maxRequests: 10,
    windowMs: 300_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const body = await req.json();
  const rawOrderNumber =
    typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  const rawEmail =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!rawOrderNumber || !rawEmail) {
    return NextResponse.json(
      {
        success: false,
        error: "Bitte Bestellnummer und E-Mail-Adresse angeben.",
      },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return NextResponse.json(
      { success: false, error: "Bitte eine gültige E-Mail-Adresse angeben." },
      { status: 400 }
    );
  }

  const order = await db.order.findUnique({
    where: { orderNumber: rawOrderNumber },
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

  // Constant-ish timing: always return the same "not found" message
  // whether the order exists or the email doesn't match. Keeps the
  // endpoint from being a "is this order number real?" oracle.
  const matches = (() => {
    if (!order) return false;
    const orderEmail = (
      order.user?.email ?? order.guestEmail ?? ""
    ).toLowerCase();
    return !!orderEmail && orderEmail === rawEmail;
  })();

  if (!order || !matches) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Keine Bestellung gefunden, die zu dieser Bestellnummer und E-Mail-Adresse passt.",
      },
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
