import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ensureShippingRatesSeeded } from "@/lib/shipping/rates";

/**
 * GET /api/admin/shipping
 *
 * Liefert ALLE Versandtarife (auch deaktivierte) für die Admin-UI.
 * Public-Endpoint /api/shipping/rates filtert auf isActive=true.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }
  await ensureShippingRatesSeeded();
  const rates = await db.shippingRate.findMany({
    orderBy: [{ sortOrder: "asc" }, { countryName: "asc" }],
  });
  return NextResponse.json({ success: true, data: rates });
}

const createSchema = z.object({
  countryCode: z
    .string()
    .length(2, "Country code must be 2 letters")
    .regex(/^[A-Z]{2}$/, "Must be uppercase ISO-3166-1 alpha-2"),
  countryName: z.string().min(1).max(80),
  priceInCents: z.number().int().min(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

/**
 * POST /api/admin/shipping
 *
 * Legt einen neuen Tarif an. Nutzlich z.B. für CH (nicht in den
 * 27 EU-Defaults), oder wenn der Admin einen US-Versand-Tarif
 * nachträglich aufnehmen will.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  // countryCode ist UNIQUE — duplicate insert würde einen P2002 werfen.
  // Wir fangen das ab und geben eine klare Fehlermeldung.
  const existing = await db.shippingRate.findUnique({
    where: { countryCode: parsed.data.countryCode },
  });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: `Tarif für ${parsed.data.countryCode} existiert bereits.`,
      },
      { status: 409 },
    );
  }

  const rate = await db.shippingRate.create({ data: parsed.data });
  return NextResponse.json({ success: true, data: rate });
}
