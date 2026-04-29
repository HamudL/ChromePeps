import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createCertificateSchema } from "@/validators/certificate";

// GET /api/admin/certificates
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  const certificates = await db.certificateOfAnalysis.findMany({
    where: productId ? { productId } : undefined,
    orderBy: { testDate: "desc" },
    include: {
      product: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json({ success: true, data: certificates });
}

// POST /api/admin/certificates
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const body = await req.json();
  // Normalize empty string reportUrl to null
  if (body.reportUrl === "") body.reportUrl = null;

  const parsed = createCertificateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
  });
  if (!product) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  const certificate = await db.certificateOfAnalysis.create({
    data: {
      productId: parsed.data.productId,
      batchNumber: parsed.data.batchNumber,
      testDate: parsed.data.testDate,
      purity: parsed.data.purity ?? null,
      testMethod: parsed.data.testMethod ?? "HPLC",
      laboratory: parsed.data.laboratory ?? "Janoshik",
      dosage: parsed.data.dosage?.trim() || null,
      reportUrl: parsed.data.reportUrl || null,
      pdfUrl: parsed.data.pdfUrl || null,
      notes: parsed.data.notes || null,
      isPublished: parsed.data.isPublished ?? true,
    },
    include: {
      product: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json(
    { success: true, data: certificate },
    { status: 201 }
  );
}
