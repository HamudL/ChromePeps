import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth, invalidateUserSessions } from "@/lib/auth";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { updateProfileSchema, changePasswordSchema } from "@/validators/auth";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { generateEmailVerifyToken } from "@/lib/email-verify";
import { sendEmailVerifyEmail } from "@/lib/mail/send";
import { EMAIL_VERIFY_TOKEN_TTL_MS } from "@/lib/constants";

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

  if (!user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

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

  // Kaputter Body → safeParse(null) → 400 statt unbehandelter 500.
  const body = await parseJsonBody(req);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  // Ändert sich die E-Mail wirklich? (Vorher: jeder PATCH mit email-Feld
  // behielt den alten emailVerified-Status — die neue Adresse war nie
  // verifiziert, galt aber als verifiziert.) Ein findMany beantwortet
  // "aktuelle E-Mail?" UND "neue Adresse vergeben?" in EINEM Roundtrip.
  let emailChanged = false;
  if (parsed.data.email) {
    const rows = await db.user.findMany({
      where: {
        OR: [{ id: session.user.id }, { email: parsed.data.email }],
      },
      select: { id: true, email: true },
    });
    const current = rows.find((r) => r.id === session.user.id);
    const conflict = rows.find((r) => r.id !== session.user.id);
    emailChanged = !!current && current.email !== parsed.data.email;

    if (emailChanged && conflict) {
      return NextResponse.json(
        { success: false, error: "Email already in use" },
        { status: 409 }
      );
    }
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...parsed.data,
      // Neue Adresse ist unverifiziert, bis der Bestätigungs-Link
      // geklickt wurde.
      ...(emailChanged ? { emailVerified: null } : {}),
    },
    select: { id: true, name: true, email: true, image: true, role: true },
  });

  // Verifizierungs-Mail an die NEUE Adresse — fire-and-forget, der
  // Profil-Update selbst ist bereits committed.
  if (emailChanged && user.email) {
    try {
      const { rawToken, tokenHash } = generateEmailVerifyToken();
      await db.verificationToken.create({
        data: {
          identifier: user.email,
          token: tokenHash,
          expires: new Date(Date.now() + EMAIL_VERIFY_TOKEN_TTL_MS),
        },
      });
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      if (baseUrl) {
        void sendEmailVerifyEmail({
          to: user.email,
          name: user.name,
          verifyUrl: `${baseUrl}/api/auth/verify-email?token=${rawToken}`,
          expiresInHours: 24,
        }).catch((err) =>
          console.error(
            "[profile] verify mail after email change failed:",
            err instanceof Error ? err.message : err
          )
        );
      }
    } catch (err) {
      console.error(
        "[profile] email change verify step failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

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

  // Kaputter Body → safeParse(null) → 400 statt unbehandelter 500.
  const body = await parseJsonBody(req);
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

  // Alle bestehenden Sessions invalidieren (inkl. der des Aufrufers —
  // bewusst: "nach Passwortänderung überall ausgeloggt"). Ein Angreifer
  // mit gestohlenem Cookie verliert damit den Zugriff.
  await invalidateUserSessions(session.user.id);

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

  const body = await parseJsonBody(req);
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

  // Block, wenn unbezahlte Vorkasse-Bestellungen offen sind. Sonst
  // würde die Order anonymisiert während der Kunde noch zahlen will,
  // und die Bank-Eingänge ließen sich später nicht mehr sauber
  // zuordnen. Stripe-Bestellungen sind hier KEIN Issue (die laufen
  // synchron im Webhook + haben jetzt einen Recovery-Pfad in
  // createOrderFromStripeSession), und abgeschlossene Bestellungen
  // dürfen anonymisiert werden — die bleiben für die rechtliche
  // Aufbewahrung erhalten.
  const pendingBankTransfer = await db.order.count({
    where: {
      userId,
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: "PENDING",
    },
  });
  if (pendingBankTransfer > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Sie haben ${pendingBankTransfer} offene Vorkasse-${
          pendingBankTransfer === 1 ? "Bestellung" : "Bestellungen"
        }. Bitte schließen Sie die Zahlung erst ab oder kontaktieren Sie den Support, bevor Sie das Konto löschen.`,
      },
      { status: 409 },
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
