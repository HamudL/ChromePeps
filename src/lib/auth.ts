import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/validators/auth";
import type { Role } from "@prisma/client";
import { authConfig } from "@/lib/auth.config";
import {
  verifyTotpCode,
  consumeRecoveryCode,
  isEncryptedSecret,
  encryptTotpSecret,
} from "@/lib/two-factor";

/**
 * Custom CredentialsSignin error mit `code` der vom Client als
 * `?error=<code>`-Param ausgewertet werden kann. NextAuth v5 macht
 * das automatisch wenn die Klasse von CredentialsSignin erbt — die
 * `code`-Property landet im URL-Param.
 */
class TwoFactorRequiredError extends CredentialsSignin {
  code = "TwoFactorRequired";
}
class InvalidTwoFactorCodeError extends CredentialsSignin {
  code = "InvalidTwoFactorCode";
}
class RateLimitedError extends CredentialsSignin {
  code = "RateLimited";
}
class CaptchaRequiredError extends CredentialsSignin {
  code = "CaptchaRequired";
}

// Vorberechneter bcrypt-Hash (cost 12) für Timing-Angleichung: Wenn die
// E-Mail unbekannt ist, vergleichen wir trotzdem gegen diesen Dummy,
// damit "User existiert" und "User existiert nicht" dieselbe Antwortzeit
// haben (sonst User-Enumeration über die ~250ms bcrypt-Differenz).
const DUMMY_BCRYPT_HASH =
  "$2b$12$C63VRTmd/r4a9kPzGQNu5.B4vm3NVaM7JjDnltcgdXA3JKH/lDBvO";

/**
 * Failure-Counting + Captcha-Threshold leben in src/lib/login-failures.ts
 * (eine Quelle für authorize() UND die UX-Server-Action). Hier nur ein
 * dünner dynamic-import-Wrapper, weil dieses Modul keine Top-Level-
 * Redis-Importe haben darf (Edge-Bundle, siehe Kommentar oben).
 */
async function recordAuthFailure(email: string): Promise<void> {
  const { recordLoginFailure } = await import("@/lib/login-failures");
  await recordLoginFailure(email);
}

// IMPORTANT: do NOT statically import `@/lib/redis` at the top of this
// file. This module is transitively imported by code that runs on the
// Edge Runtime (where `ioredis` touches Node-only APIs at module-load
// time). The session callback below dynamic-imports the Redis helpers
// so they only get bundled into the Node runtime chunks. The middleware
// NEVER imports this file — it uses src/lib/auth.config.ts directly —
// so even the dynamic import is never reached in the Edge bundle.

// Short TTL for the session-callback user lookup. This turns the "does this
// user still exist?" check from a per-request DB hit into a per-minute one.
// Trade-off: when an admin deletes a user or changes their role, the change
// propagates on the next cache miss (up to 60 s). That is acceptable because
// destructive role changes are rare and the primary use of this check is to
// catch full DB wipes / re-seeds, not to enforce fresh permissions on every
// click.
const SESSION_USER_TTL_SECONDS = 60;

type CachedSessionUser = {
  // Wrapping in an object lets us distinguish "uncached" (cacheGet -> null)
  // from "cached as deleted" (cacheGet -> { row: null }).
  row: { id: string; role: Role; sessionVersion: number } | null;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role: Role;
    // Optional, weil OAuth-Adapter-User sie erst nach dem DB-Read
    // tragen; fehlende Werte werden als 0 interpretiert.
    sessionVersion?: number;
  }
}

declare module "next-auth" {
  interface JWT {
    id: string;
    role: Role;
    // Session-Version zum Sign-In-Zeitpunkt (siehe schema.prisma).
    sv?: number;
  }
}

// EINE Stelle für das Key-Format des Session-User-Caches. Der v2-Suffix
// versioniert das Cache-Shape — beim nächsten Shape-Bump NUR hier ändern,
// damit Reader (session-Callback) und Purger nie auseinanderlaufen.
export function sessionUserCacheKey(userId: string): string {
  return `auth:session-user:v2:${userId}`;
}

/**
 * Räumt den Redis-Session-Cache eines Users, damit Änderungen an
 * sessionVersion/Rolle sofort greifen (nicht erst nach 60s TTL).
 * Für Caller, die das Versions-Increment bereits selbst (z.B. in einer
 * Transaktion) erledigt haben — etwa der Passwort-Reset.
 */
export async function purgeSessionUserCache(userId: string): Promise<void> {
  try {
    const { cacheDel } = await import("@/lib/redis");
    await cacheDel(sessionUserCacheKey(userId));
  } catch {
    /* Cache-TTL (60s) räumt notfalls auf */
  }
}

/**
 * Invalidiert alle bestehenden JWT-Sessions eines Users: inkrementiert
 * users.sessionVersion und räumt den Redis-Session-Cache, damit die
 * Änderung sofort greift (nicht erst nach TTL-Ablauf). Aufzurufen nach
 * Passwort-Reset, Passwort-Wechsel und 2FA-Aktivierung — der Token des
 * Angreifers (oder ein gestohlener Cookie) trägt danach eine alte
 * Version und wird vom session-Callback verworfen. Der LEGITIME Caller
 * muss sich danach ebenfalls neu anmelden (bewusst: das ist das
 * Standard-Verhalten "nach Passwortänderung überall ausgeloggt").
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
  await purgeSessionUserCache(userId);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Spread the edge-safe base config (providers shape, pages, jwt +
  // authorized callbacks). We override `providers` below with the real
  // Credentials `authorize` function that does bcrypt + DB lookup, and
  // add the Prisma adapter + the full `session` callback with Redis
  // caching. Those can't go into auth.config.ts because middleware
  // imports that and middleware runs in Edge Runtime.
  ...authConfig,

  // Seit next-auth@beta.31 + @auth/prisma-adapter@2.11.2 pinnen beide
  // Pakete dieselbe @auth/core-Version (0.41.2) — der frühere
  // `as any`-Cast gegen den Branded-Type-Skew ist nicht mehr nötig.
  adapter: PrismaAdapter(db),

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Optionales 2FA-Feld. Wird nur ausgewertet wenn der User
        // tatsächlich 2FA aktiviert hat. Akzeptiert TOTP-Code (6
        // Ziffern) ODER Recovery-Code (XXXX-XXXX).
        totpCode: { label: "TOTP", type: "text" },
        // hCaptcha-Token — Pflicht sobald der Failure-Counter den
        // Threshold erreicht hat (server-enforced, s.u.).
        captchaToken: { label: "Captcha", type: "text" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const emailKey = parsed.data.email.toLowerCase();

        // ====== Server-seitige Brute-Force-Abwehr ======
        // Rate-Limit, Captcha und Failure-Counter liefen früher NUR in
        // der Server-Action checkLoginRateLimit, die der Login-Screen
        // VOR dem signIn aufrief — ein direkter POST an
        // /api/auth/callback/credentials umging alles. Deshalb läuft
        // die komplette Abwehr jetzt hier im authorize() selbst; die
        // Server-Action bleibt nur als UX-Schicht (Captcha-Einblendung
        // ohne verbrauchten Login-Versuch).
        // Dynamic imports: dieses authorize läuft ausschließlich in
        // Node (die Edge-Config in auth.config.ts hat einen No-Op) —
        // aber statische Top-Level-Imports von ioredis würden im
        // Edge-Bundle landen. Siehe Kommentar am Dateianfang.
        const { rateLimit } = await import("@/lib/rate-limit");
        const { getClientIp } = await import("@/lib/client-ip");

        const ip = getClientIp(request?.headers ?? null);
        const [emailLimit, ipLimit] = await Promise.all([
          // Pro E-Mail: 10 Aufrufe / 5 min. Eigener Key, damit die
          // UX-Action mit ihrem `login:`-Key nicht doppelt zählt.
          // 10 statt 5, weil ein 2FA-Login zwei authorize()-Durchläufe
          // braucht (Stufe 1 wirft TwoFactorRequired, Stufe 2 prüft den
          // Code) — effektiv bleiben ~5 echte Versuche.
          rateLimit(`login:authz:${emailKey}`, {
            maxRequests: 10,
            windowMs: 300_000,
          }),
          // Pro IP: großzügiger (Shared-NAT), fängt Email-Rotation.
          rateLimit(`login:authz-ip:${ip}`, {
            maxRequests: 30,
            windowMs: 300_000,
          }),
        ]);
        if (!emailLimit.success || !ipLimit.success) {
          throw new RateLimitedError();
        }

        // Captcha ab CAPTCHA_THRESHOLD Fehlversuchen — server-enforced.
        // hCaptcha-Tokens sind single-use: authorize() ist die EINZIGE
        // Stelle, die verifiziert (die UX-Action liest nur den Zähler).
        const { getLoginFailureCount, CAPTCHA_THRESHOLD } = await import(
          "@/lib/login-failures"
        );
        const failCount = await getLoginFailureCount(emailKey);
        if (failCount >= CAPTCHA_THRESHOLD) {
          const captchaToken =
            typeof credentials?.captchaToken === "string"
              ? credentials.captchaToken
              : "";
          const { verifyHCaptcha } = await import("@/lib/hcaptcha");
          const captchaOk = captchaToken
            ? await verifyHCaptcha(captchaToken)
            : false;
          if (!captchaOk) {
            throw new CaptchaRequiredError();
          }
        }

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) {
          // Timing-Angleichung gegen User-Enumeration: auch für
          // unbekannte E-Mails einen bcrypt-Vergleich bezahlen.
          await bcrypt.compare(parsed.data.password, DUMMY_BCRYPT_HASH);
          return null;
        }

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!isValid) {
          await recordAuthFailure(emailKey);
          return null;
        }

        // 2FA-Check NUR wenn der User es aktiviert hat. Soft-Mode:
        // Admins ohne 2FA dürfen weiter rein (separater Banner +
        // Setup-Empfehlung im /admin-Layout). Pflichtbetrieb wäre
        // ein separater Toggle und ist hier explizit OUT-OF-SCOPE.
        if (user.totpEnabledAt && user.totpSecret) {
          const totpInput =
            typeof credentials?.totpCode === "string"
              ? credentials.totpCode.trim()
              : "";

          if (!totpInput) {
            // Frontend zeigt daraufhin das TOTP-Eingabefeld an —
            // Password ist bereits validiert, das ist sicher.
            throw new TwoFactorRequiredError();
          }

          // 2FA-Drosselung: Ein 6-stelliger TOTP-Code hat nur 10^6
          // Kombinationen und Codes sind ±90s gültig — ohne Limit war
          // er bei bekanntem Passwort online durchprobierbar.
          // WICHTIG: Es zählen nur FEHLversuche (Peek hier, Increment
          // unten in den Fehler-Zweigen). Ein INCR-basiertes Limit über
          // alle Versuche sperrte legitime User aus, die sich nach
          // einem Passwort-Wechsel (Session-Invalidierung!) auf
          // mehreren Geräten kurz hintereinander neu anmelden.
          // Redis-down → fail-open: die E-Mail-/IP-Limits oben deckeln
          // die Gesamtversuche trotzdem.
          const TWO_FA_FAIL_LIMIT = 5;
          const TWO_FA_FAIL_TTL_SECONDS = 300;
          const twoFaFailKey = `2fa-fail:${user.id}`;
          try {
            const { redis } = await import("@/lib/redis");
            const raw = await redis.get(twoFaFailKey);
            if ((raw ? parseInt(raw, 10) || 0 : 0) >= TWO_FA_FAIL_LIMIT) {
              throw new RateLimitedError();
            }
          } catch (err) {
            if (err instanceof RateLimitedError) throw err;
          }
          const recordTwoFaFailure = async () => {
            try {
              const { redis } = await import("@/lib/redis");
              const count = await redis.incr(twoFaFailKey);
              if (count === 1) {
                await redis.expire(twoFaFailKey, TWO_FA_FAIL_TTL_SECONDS);
              }
            } catch {
              /* fail-silent */
            }
          };

          // Erst TOTP versuchen (häufigster Fall). Fallback auf
          // Recovery-Code wenn TOTP nicht passt UND der Input
          // nach Recovery-Code aussieht (8 chars, optional Dash).
          const totpOk = verifyTotpCode(totpInput, user.totpSecret);
          if (!totpOk) {
            const cleaned = totpInput.toUpperCase().replace(/\s+/g, "");
            const looksLikeRecovery =
              cleaned.length === 8 || cleaned.length === 9;
            if (looksLikeRecovery) {
              const newCodes = await consumeRecoveryCode(
                totpInput,
                user.totpRecoveryCodes,
              );
              if (!newCodes) {
                await recordAuthFailure(emailKey);
                await recordTwoFaFailure();
                throw new InvalidTwoFactorCodeError();
              }
              await db.user.update({
                where: { id: user.id },
                data: { totpRecoveryCodes: newCodes },
              });
            } else {
              await recordAuthFailure(emailKey);
              await recordTwoFaFailure();
              throw new InvalidTwoFactorCodeError();
            }
          } else if (!isEncryptedSecret(user.totpSecret)) {
            // Lazy-Migration: TOTP war gültig, aber das Secret liegt noch
            // als Klartext-Altbestand vor → beim ersten erfolgreichen Login
            // at-rest verschlüsseln. Best-effort: Login NIEMALS blockieren,
            // wenn dieser Write fehlschlägt.
            try {
              await db.user.update({
                where: { id: user.id },
                data: { totpSecret: encryptTotpSecret(user.totpSecret) },
              });
            } catch {
              /* non-fatal — nächster Login versucht es erneut */
            }
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          // Wandert via jwt-Callback als `sv` in den Token — Grundlage
          // der Session-Invalidierung nach Credential-Änderungen.
          sessionVersion: user.sessionVersion,
        };
      },
    }),
    // Google OAuth — Node-Side mit Account-Linking via PrismaAdapter.
    // `allowDangerousEmailAccountLinking: true` ist OK weil Google
    // verifizierte Emails liefert (siehe Kommentar in auth.config.ts).
    // AUDIT_REPORT_v3 §6 PR 4.
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  events: {
    // Bei jedem erfolgreichen Sign-In (Credentials oder OAuth):
    //   - Login-Failure-Counter im Redis löschen, damit das Captcha
    //     nicht weiter angezeigt wird
    //   - Bei Google-Sign-In zusätzlich `emailVerified` setzen — Google
    //     liefert verifizierte Emails per definition
    async signIn({ user, account }) {
      if (user?.email) {
        try {
          const { clearLoginFailures } = await import("@/lib/login-failures");
          await clearLoginFailures(user.email);
          const { redis } = await import("@/lib/redis");
          await redis.del(`register-fail:${user.email.toLowerCase()}`);
          // 2FA-Fehlversuchs-Zähler nach erfolgreichem Login zurücksetzen.
          if (user.id) {
            await redis.del(`2fa-fail:${user.id}`);
          }
        } catch {
          /* fail-silent */
        }
      }

      if (account?.provider === "google" && user?.id) {
        await db.user
          .update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          })
          .catch(() => {
            /* no-op wenn user-row noch nicht da (race) */
          });
      }
    },
  },

  callbacks: {
    // Preserve the edge-safe jwt and authorized callbacks from the
    // base config. Overriding the callbacks object would drop them.
    ...authConfig.callbacks,

    async session({ session, token }) {
      if (token) {
        // Verify the user still exists in the DB (handles DB wipe / re-seed).
        // Cached in Redis with a 60 s TTL so authenticated routes don't hit
        // Postgres on every request. If Redis is unreachable, cacheGet/cacheSet
        // fall through to null and we degrade gracefully to the old behavior.
        //
        // Dynamic import (not a top-level import) — see the note at the top
        // of this file. This callback runs in Node only; middleware uses
        // authConfig directly and never reaches this code path.
        const { cacheGet, cacheSet } = await import("@/lib/redis");
        // Key-Version v2: Cache-Shape trägt jetzt sessionVersion —
        // Alt-Einträge ohne das Feld dürfen nicht gelesen werden.
        const cacheKey = sessionUserCacheKey(token.id as string);
        let cached = await cacheGet<CachedSessionUser>(cacheKey);
        if (cached === null) {
          const row = await db.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, role: true, sessionVersion: true },
          });
          cached = { row };
          await cacheSet(cacheKey, cached, SESSION_USER_TTL_SECONDS);
        }
        // Session-Versioning: Tokens, die VOR einem Passwort-Reset/
        // -Wechsel oder einer 2FA-Aktivierung ausgestellt wurden,
        // tragen eine ältere Version und werden verworfen. Tokens ohne
        // sv-Claim (Bestands-Sessions vor diesem Deploy) zählen als
        // Version 0 — das entspricht ihrem tatsächlichen Ausstellungs-
        // stand und vermeidet einen Massen-Logout beim Rollout.
        const tokenVersion = typeof token.sv === "number" ? token.sv : 0;
        if (cached.row && cached.row.sessionVersion !== tokenVersion) {
          cached = { row: null };
        }
        if (!cached.row) {
          // User wurde in der DB gelöscht (oder DB wurde gewiped).
          // Wir markieren die Session mit `id=""` UND setzen expires
          // in die Vergangenheit, damit NextAuth den Session-Cookie
          // verwirft und das Frontend automatisch auf unauthenticated
          // schaltet. `requireAuth()` / `auth()` call-sites sehen
          // entweder kein user-Objekt mehr (über den expires-check
          // von NextAuth) oder einen leeren `id`, den die Helpers
          // zusätzlich abfangen.
          session.user.id = "";
          session.user.role = "USER" as Role;
          session.expires = new Date(0).toISOString() as typeof session.expires;
          return session;
        }
        session.user.id = cached.row.id;
        session.user.role = cached.row.role;
      }
      return session;
    },
  },
});
