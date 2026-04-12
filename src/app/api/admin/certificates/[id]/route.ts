import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { updateCertificateSchema } from "@/validators/certificate";

// PATCH /api/admin/certificates/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();
  if (body.reportUrl === "") body.reportUrl = null;

  const parsed = updateCertificateSchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const existing = await db.certificateOfAnalysis.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Certificate not found" },
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...updateData } = parsed.data;

  const certificate = await db.certificateOfAnalysis.update({
    where: { id },
    data: updateData,
    include: {
      product: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json({ success: true, data: certificate });
}

// DELETE /api/admin/certificates/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await db.certificateOfAnalysis.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Certificate not found" },
      { status: 404 }
    );
  }

  await db.certificateOfAnalysis.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
