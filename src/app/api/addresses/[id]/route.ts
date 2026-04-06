import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { updateAddressSchema } from "@/validators/address";

// PATCH /api/addresses/[id]
export async function PATCH(
  req: NextRequest,
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
  const body = await req.json();
  const parsed = updateAddressSchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const existing = await db.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: "Address not found" },
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...updateData } = parsed.data;

  if (updateData.isDefault) {
    await db.address.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await db.address.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ success: true, data: address });
}

// DELETE /api/addresses/[id]
export async function DELETE(
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

  const existing = await db.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: "Address not found" },
      { status: 404 }
    );
  }

  await db.address.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
