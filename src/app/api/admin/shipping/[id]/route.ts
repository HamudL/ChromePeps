import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, isPrismaUniqueError } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseJsonBody } from "@/lib/api/parse-json-body";

/**
 * PATCH/DELETE /api/admin/shipping/[id]
 *
 * Update/Delete eines einzelnen Versandtarifs. Update ist partial (jedes
 * Feld optional); Delete ist hart, weil wir keine Fremdschlüssel auf
 * shipping_rates haben — der Tarif ist nur lookup-target, kein Order-
 * Bestandteil. Auf bereits versandten Orders bleibt `shippingInCents`
 * als Snapshot erhalten.
 */

const updateSchema = z.object({
  countryCode: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
  countryName: z.string().min(1).max(80).optional(),
  priceInCents: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = await parseJsonBody(req);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  try {
    const rate = await db.shippingRate.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ success: true, data: rate });
  } catch (err: unknown) {
    if (isPrismaUniqueError(err)) {
      return NextResponse.json(
        { success: false, error: "Country code bereits vergeben." },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const { id } = await params;
  await db.shippingRate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
