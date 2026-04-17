import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders/export
 *
 * Streams a CSV of orders for admins. Query params:
 *   - from=YYYY-MM-DD    (inclusive, optional)
 *   - to=YYYY-MM-DD      (inclusive end-of-day, optional)
 *   - status=...         (OrderStatus filter, optional)
 *
 * Format:
 *   - UTF-8 with BOM so Excel detects encoding correctly for umlauts
 *   - Semicolon separated (German Excel default)
 *   - One row per order (not per item). Item list is joined into one cell.
 */

type CsvCell = string | number | null | undefined;

function csvEscape(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape cells containing delimiter, quote, or newline per RFC4180.
  if (/[";\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(cells: CsvCell[]): string {
  return cells.map(csvEscape).join(";");
}

function formatCents(cents: number): string {
  // German decimal format — Excel parses "12,34" as a number in de locale.
  return (cents / 100).toFixed(2).replace(".", ",");
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const statusFilter = searchParams.get("status");

  const where: Prisma.OrderWhereInput = {};
  if (from || to) {
    where.createdAt = {};
    if (from) {
      const d = new Date(from);
      if (!isNaN(d.getTime())) (where.createdAt as { gte?: Date }).gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!isNaN(d.getTime())) {
        // End-of-day inclusive.
        d.setHours(23, 59, 59, 999);
        (where.createdAt as { lte?: Date }).lte = d;
      }
    }
  } else {
    // Default window: last 12 months. Without this default, the export
    // would load every order ever into memory on every call — OOM bait
    // once the catalog has any real history. Admins that need older
    // data can pass explicit `from`/`to` query params.
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    where.createdAt = { gte: twelveMonthsAgo };
  }
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter as Prisma.EnumOrderStatusFilter;
  }

  // Hard cap even on filtered exports — 10 000 rows is ~2 MB of CSV which
  // still fits comfortably in the 512 MB container memory cap. If this ever
  // becomes limiting, switch to a streaming pagination loop.
  const MAX_EXPORT_ROWS = 10_000;

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: MAX_EXPORT_ROWS,
    include: {
      user: { select: { name: true, email: true } },
      items: {
        select: {
          productName: true,
          variantName: true,
          quantity: true,
        },
      },
      shippingAddress: {
        select: {
          city: true,
          postalCode: true,
          country: true,
        },
      },
    },
  });

  const header = [
    "Bestellnummer",
    "Datum",
    "Kunde Name",
    "Kunde E-Mail",
    "Status",
    "Payment Status",
    "Zahlungsart",
    "Artikel",
    "Anzahl Positionen",
    "Zwischensumme EUR",
    "Rabatt EUR",
    "Versand EUR",
    "Steuer EUR",
    "Gesamt EUR",
    "Rabattcode",
    "Stadt",
    "PLZ",
    "Land",
    "Tracking-Nr",
  ];

  const lines: string[] = [toCsvRow(header)];

  for (const order of orders) {
    const itemsDescription = order.items
      .map((it) => {
        const variant = it.variantName ? ` (${it.variantName})` : "";
        return `${it.quantity}x ${it.productName}${variant}`;
      })
      .join(" | ");

    lines.push(
      toCsvRow([
        order.orderNumber,
        formatDate(order.createdAt),
        // Prefer the account's name/email; fall back to guestName/
        // guestEmail for guest orders so the export stays complete.
        order.user?.name ?? order.guestName ?? "",
        order.user?.email ?? order.guestEmail ?? "",
        order.status,
        order.paymentStatus,
        order.paymentMethod,
        itemsDescription,
        order.items.length,
        formatCents(order.subtotalInCents),
        formatCents(order.discountInCents),
        formatCents(order.shippingInCents),
        formatCents(order.taxInCents),
        formatCents(order.totalInCents),
        order.promoCode ?? "",
        order.shippingAddress?.city ?? "",
        order.shippingAddress?.postalCode ?? "",
        order.shippingAddress?.country ?? "",
        order.trackingNumber ?? "",
      ])
    );
  }

  // CRLF line endings for max Excel compatibility + UTF-8 BOM.
  const csvBody = lines.join("\r\n") + "\r\n";
  const bom = "\uFEFF";
  const payload = bom + csvBody;

  const now = new Date();
  const stamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const filename = `chromepeps-orders-${stamp}.csv`;

  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
