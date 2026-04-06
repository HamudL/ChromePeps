import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { updateProfileSchema, changePasswordSchema } from "@/validators/auth";
import bcrypt from "bcryptjs";

// GET /api/profile
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true, addresses: true } },
    },
  });

  return NextResponse.json({ success: true, data: user });
}

// PATCH /api/profile — update name/email
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  if (parsed.data.email) {
    const existing = await db.user.findFirst({
      where: { email: parsed.data.email, NOT: { id: session.user.id } },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already in use" },
        { status: 409 }
      );
    }
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, image: true, role: true },
  });

  return NextResponse.json({ success: true, data: user });
}

// PUT /api/profile — change password
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.passwordHash) {
    return NextResponse.json(
      { success: false, error: "Password login not configured" },
      { status: 400 }
    );
  }

  const isValid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!isValid) {
    return NextResponse.json(
      { success: false, error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ success: true });
}
