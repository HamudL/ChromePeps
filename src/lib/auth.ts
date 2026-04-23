import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/validators/auth";
import type { Role } from "@prisma/client";
import { authConfig } from "@/lib/auth.config";

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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],

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
