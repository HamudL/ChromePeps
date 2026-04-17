import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { checkPromoApplicability } from "@/lib/order/promo-applicability";

/**
 * POST /api/promos/validate — validate a promo code for the current
 * buyer, whether they have an account or are checking out as a
 * guest. Auth users are keyed by session.user.id; guests are keyed
 * by the `guestEmail` field in the request body. The "one redemption
 * per buyer" rule is enforced against whichever key is present.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  const body = await req.json();
  const code = (body.code ?? "").trim().toUpperCase();
  const subtotalInCents: number = body.subtotalInCents ?? 0;
  const rawGuestEmail =
    typeof body.guestEmail === "string" ? body.guestEmail.trim().toLowerCase() : "";

  // Identity: either a logged-in user OR a guest email. A guest
  // without an email can't have their "one use per buyer" rule
  // enforced, so we require email in guest mode.
  const userId = session?.user?.id ?? null;
  const guestEmail = userId ? null : rawGuestEmail;

  if (!userId && !guestEmail) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Bitte eine E-Mail angeben oder einloggen, um einen Promo-Code einzulösen.",
      },
      { status: 400 }
    );
  }

  if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
    return NextResponse.json(
      { success: false, error: "Bitte eine gültige E-Mail-Adresse angeben." },
      { status: 400 }
    );
  }

  // Rate-limit per identity. We key on userId when available and
  // fall back to guestEmail for anonymous checks, so a spammer
  // can't bypass the limit just by omitting their email.
  const rateKey = userId
    ? `promo-validate:user:${userId}`
    : `promo-validate:guest:${guestEmail}`;
  const limit = await rateLimit(rateKey, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  if (!code) {
    return NextResponse.json(
      { success: false, error: "Please enter a promo code" },
      { status: 400 }
    );
  }

  const promo = await db.promoCode.findUnique({ where: { code } });

  if (!promo) {
    return NextResponse.json(
      { success: false, error: "Invalid promo code" },
      { status: 404 }
    );
  }

  // Whether the current buyer has already redeemed this code. Auth
  // users are keyed by userId; guests by guestEmail. The DB has
  // matching indexes so both lookups are fast.
  const alreadyUsed = !!(await db.promoUsage.findFirst({
    where: userId
      ? { promoId: promo.id, userId }
      : { promoId: promo.id, guestEmail: guestEmail! },
  }));

  // All other rules (active, dates, max-uses, min-order, discount
  // calculation) are delegated to the shared pure helper so this
  // endpoint, POST /api/stripe/checkout, and POST /api/checkout/
  // bank-transfer all agree on what "valid" means.
  const check = checkPromoApplicability({
    promo,
    now: new Date(),
    subtotalInCents,
    alreadyUsedByUser: alreadyUsed,
  });

  if (!check.applicable) {
    return NextResponse.json(
      { success: false, error: check.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountAmount: check.discountInCents,
      description: promo.description,
    },
  });
}
