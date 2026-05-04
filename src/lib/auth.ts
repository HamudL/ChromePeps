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
  row: { id: string; role: Role } | null;
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
  }
}

declare module "next-auth" {
  interface JWT {
    id: string;
    role: Role;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Spread the edge-safe base config (providers shape, pages, jwt +
  // authorized callbacks). We override `providers` below with the real
  // Credentials `authorize` function that does bcrypt + DB lookup, and
  // add the Prisma adapter + the full `session` callback with Redis
  // caching. Those can't go into auth.config.ts because middleware
  // imports that and middleware runs in Edge Runtime.
  ...authConfig,

  // KNOWN LIMITATION: Type cast required due to a version skew between
  // next-auth@5.0.0-beta.25 and @auth/prisma-adapter's expected @auth/core
  // version. Both packages ship their own copy of @auth/core, and TS sees the
  // adapter's `Adapter` type as incompatible with next-auth's. The runtime
  // contract is identical — only the branded types differ. Revisit this cast
  // when next-auth reaches GA or when @auth/prisma-adapter aligns with the
  // beta. Until then, `as unknown as never` would also work but `as any`
  // matches how upstream examples paper over the same issue.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db) as any,

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
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!isValid) return null;

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
                throw new InvalidTwoFactorCodeError();
              }
              await db.user.update({
                where: { id: user.id },
                data: { totpRecoveryCodes: newCodes },
              });
            } else {
              throw new InvalidTwoFactorCodeError();
            }
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
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
          const { redis } = await import("@/lib/redis");
          await redis.del(`login-fail:${user.email.toLowerCase()}`);
          await redis.del(`register-fail:${user.email.toLowerCase()}`);
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
        const cacheKey = `auth:session-user:${token.id}`;
        let cached = await cacheGet<CachedSessionUser>(cacheKey);
        if (cached === null) {
          const row = await db.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, role: true },
          });
          cached = { row };
          await cacheSet(cacheKey, cached, SESSION_USER_TTL_SECONDS);
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
