import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { writeAuditLog } from "@/lib/admin-audit";

const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

// PATCH /api/admin/users/[id] — update user role
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

  // Prevent self-demotion
  if (id === session.user.id) {
    return NextResponse.json(
      { success: false, error: "Cannot change your own role" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = updateUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const previousUser = await db.user.findUnique({
    where: { id },
    select: { role: true, email: true },
  });

  const user = await db.user.update({
    where: { id },
    data: { role: parsed.data.role },
    select: { id: true, name: true, email: true, role: true },
  });

  await writeAuditLog(req, {
    action: "user.role_change",
    entity: "user",
    entityId: id,
    payload: {
      targetEmail: user.email,
      previousRole: previousUser?.role ?? null,
      newRole: parsed.data.role,
    },
  });

  return NextResponse.json({ success: true, data: user });
}

// DELETE /api/admin/users/[id] — delete user (soft: deactivate, or hard)
export async function DELETE(
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

  if (id === session.user.id) {
    return NextResponse.json(
      { success: false, error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  // Check for existing orders — hard delete would cascade and lose order data
  const orderCount = await db.order.count({ where: { userId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot delete: user has ${orderCount} order(s). Deactivate instead.`,
      },
      { status: 400 }
    );
  }

  const userToDelete = await db.user.findUnique({
    where: { id },
    select: { email: true, role: true },
  });

  await db.user.delete({ where: { id } });

  await writeAuditLog(req, {
    action: "user.delete",
    entity: "user",
    entityId: id,
    payload: {
      deletedUserEmail: userToDelete?.email ?? null,
      deletedUserRole: userToDelete?.role ?? null,
    },
  });

  return NextResponse.json({ success: true });
}
