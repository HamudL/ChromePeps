import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/order/generate-order-number";
import { calculateOrderTotals } from "@/lib/order/calculate-totals";

/**
 * POST /api/admin/orders/test
 *
 * Legt eine Testbestellung direkt in der DB an — KEINE Zahlungs-,
 * Stock-, oder Mail-Nebenwirkungen. Dient dem Admin, um Flows wie
 * "Bestellung shippen", "Review-Mail triggern", "CSV-Export" etc. mit
 * realistischen Daten durchzuspielen, ohne echte Umsätze zu
 * verfälschen.
 *
 * Die erzeugte Order hat `isTestOrder: true` und wird überall in
 * Admin-Dashboards, Statistiken, Exports und E-Mail-Versand gefiltert.
 */

const testOrderSchema = z.object({
  // Kunde: entweder bestehender User oder Gast (Name+E-Mail).
  customerType: z.enum(["user", "guest"]),
  userId: z.string().cuid().optional(),
  guestName: z.string().min(1).max(120).optional(),
  guestEmail: z.string().email().max(160).optional(),

  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        variantId: z.string().cuid().optional(),
        quantity: z.number().int().min(1).max(100),
      })
    )
    .min(1)
    .max(20),

  status: z
    .enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"])
    .default("PROCESSING"),
  paymentStatus: z
    .enum(["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"])
    .default("SUCCEEDED"),
  paymentMethod: z.enum(["STRIPE", "BANK_TRANSFER"]).default("STRIPE"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const raw = await req.json().catch(() => null);
  if (!raw) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = testOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // Customer validation — müssen den referenzierten User oder die
  // Gast-Felder vollständig haben.
  let userId: string | null = null;
  let guestEmail: string | null = null;
  let guestName: string | null = null;

  if (input.customerType === "user") {
    if (!input.userId) {
      return NextResponse.json(
        { success: false, error: "userId ist erforderlich für customerType=user" },
        { status: 400 }
      );
    }
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Kunde nicht gefunden" },
        { status: 404 }
      );
    }
    userId = user.id;
  } else {
    if (!input.guestEmail || !input.guestName) {
      return NextResponse.json(
        {
          success: false,
          error: "guestName und guestEmail sind erforderlich für customerType=guest",
        },
        { status: 400 }
      );
    }
    guestEmail = input.guestEmail.toLowerCase();
    guestName = input.guestName;
  }

  // Produkte/Varianten serverseitig auflösen — wir vertrauen den
  // Client-Preisen nicht (auch für Test-Orders halten wir uns an das
  // Muster).
  const productIds = Array.from(new Set(input.items.map((i) => i.productId)));
  const variantIds = Array.from(
    new Set(input.items.map((i) => i.variantId).filter((v): v is string => !!v))
  );

  const [products, variants] = await Promise.all([
    db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, priceInCents: true },
    }),
    variantIds.length
      ? db.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            productId: true,
            name: true,
            sku: true,
            priceInCents: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const orderItems: Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    priceInCents: number;
  }> = [];

  let subtotalInCents = 0;

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: `Produkt ${item.productId} nicht gefunden`,
        },
        { status: 404 }
      );
    }
    const variant = item.variantId ? variantMap.get(item.variantId) : null;
    if (item.variantId && !variant) {
      return NextResponse.json(
        {
          success: false,
          error: `Variante ${item.variantId} nicht gefunden`,
        },
        { status: 404 }
      );
    }
    if (variant && variant.productId !== product.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Variante passt nicht zum angegebenen Produkt",
        },
        { status: 400 }
      );
    }
    const price = variant?.priceInCents ?? product.priceInCents;
    const sku = variant?.sku ?? product.sku;
    subtotalInCents += price * item.quantity;
    orderItems.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: product.name,
      variantName: variant?.name ?? null,
      sku,
      quantity: item.quantity,
      priceInCents: price,
    });
  }

  const totals = calculateOrderTotals({ subtotalInCents, discountInCents: 0 });

  // Status-abhängige Timestamps — damit die Test-Order im Admin-UI
  // plausibel aussieht (SHIPPED ohne shippedAt wäre seltsam).
  const now = new Date();
  const statusTimestamps: Record<string, Date> = {};
  if (input.status === "SHIPPED" || input.status === "DELIVERED") {
    statusTimestamps.shippedAt = now;
  }
  if (input.status === "DELIVERED") {
    statusTimestamps.deliveredAt = now;
  }

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        guestEmail,
        guestName,
        status: input.status,
        paymentStatus: input.paymentStatus,
        paymentMethod: input.paymentMethod,
        subtotalInCents: totals.subtotalInCents,
        discountInCents: totals.discountInCents,
        taxInCents: totals.taxInCents,
        shippingInCents: totals.shippingInCents,
        totalInCents: totals.totalInCents,
        isTestOrder: true,
        items: { createMany: { data: orderItems } },
        ...statusTimestamps,
      },
    });

    await tx.orderEvent.create({
      data: {
        orderId: created.id,
        status: input.status,
        note: "Testbestellung vom Admin angelegt",
      },
    });

    return created;
  });

  return NextResponse.json({
    success: true,
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalInCents: order.totalInCents,
    },
  });
}
