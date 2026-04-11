import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// DELETE /api/admin/newsletter/[id] — remove a newsletter subscriber
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

  const existing = await db.newsletterSubscriber.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Subscriber not found" },
      { status: 404 }
    );
  }

  await db.newsletterSubscriber.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
