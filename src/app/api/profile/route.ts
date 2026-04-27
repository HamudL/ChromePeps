import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { updateProfileSchema, changePasswordSchema } from "@/validators/auth";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
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

  const limit = await rateLimit(`profile:${session.user.id}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

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

  // Strict rate limit — password brute-force protection
  const limit = await rateLimit(`password:${session.user.id}`, {
    maxRequests: 5,
    windowMs: 300_000, // 5 attempts per 5 minutes
  });
  if (!limit.success) return rateLimitExceeded(limit);

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

// DELETE /api/profile — Konto endgültig löschen (mit Anonymisierung)
//
// Datenschutz/Recht:
//   - Bestelldaten MÜSSEN aus rechtlichen Gründen 10 Jahre aufbewahrt
//     werden (§147 AO + §257 HGB für Buchungsbelege). Daher hartes
//     User-Delete + Order-Anonymisierung statt Cascade-Delete.
//   - Marker `deleted-<userId>@deleted.local` bleibt deterministisch
//     pro alter User-ID, damit (Order.userId, Order.guestEmail) weiter
//     der "exactly one non-null"-Constraint erfüllt. Die User-ID
//     selbst ist intern und enthält keine PII.
//   - Cascade-Delete auf Account, Session, Cart, Address, Review,
//     PromoUsage, WishlistItem läuft automatisch über die Schema-
//     Definitionen — siehe `onDelete: Cascade` jeweils.
//
// Sicherheit:
//   - Re-Auth via Passwort-Body (nicht nur Session-Cookie), damit ein
//     gestohlenes Cookie kein Konto destroyen kann.
//   - Rate-Limit 3/h pro User — destructive op, deshalb engster Bracket.
const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1, "Passwort ist erforderlich"),
});

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const limit = await rateLimit(`delete-account:${session.user.id}`, {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const body = await req.json().catch(() => null);
  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  // Password-Verify gegen die DB. Wenn `passwordHash` fehlt (z.B.
  // Account wurde nur via OAuth angelegt), reject — der User soll
  // dann den Support kontaktieren statt einer destructiven Aktion
  // ohne sauberen Identitätsnachweis.
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Konto nicht gefunden." },
      { status: 404 },
    );
  }
  if (!user.passwordHash) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Konten ohne Passwort können nur über den Support gelöscht werden: support@chromepeps.com",
      },
      { status: 400 },
    );
  }

  const isValid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!isValid) {
    return NextResponse.json(
      { success: false, error: "Passwort ist falsch." },
      { status: 400 },
    );
  }

  const anonEmail = `deleted-${userId}@deleted.local`;
  const anonName = "Gelöschter Nutzer";

  // Atomar: Orders anonymisieren + User löschen. Wenn irgendetwas
  // failt, rollback statt einem halb-anonymisierten Zustand.
  let affectedOrders = 0;
  await db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { userId },
      data: { userId: null, guestEmail: anonEmail, guestName: anonName },
    });
    affectedOrders = updated.count;

    // User-Row löschen — Cascade säubert Account/Session/Cart/Address/
    // Review/PromoUsage/WishlistItem in einem Rutsch.
    await tx.user.delete({ where: { id: userId } });
  });

  // Audit-Log: keine PII (Email/Name sind weg), nur User-ID + Zähler.
  // Hilft bei Compliance-Anfragen ("wann wurde User X gelöscht").
  console.info(
    `[account] Account deleted: userId=${userId} ordersAnonymized=${affectedOrders}`,
  );

  return NextResponse.json({ success: true, data: { affectedOrders } });
}
