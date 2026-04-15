import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/validators/auth";
import type { Role } from "@prisma/client";

// IMPORTANT: do NOT statically import `@/lib/redis` at the top of this
// file. This module is transitively imported by `src/middleware.ts`, which
// runs on the Edge Runtime where `ioredis` is not usable (it touches
// Node-only APIs like `net` and `Buffer` at module-load time). The session
// callback dynamically imports the Redis helpers so they only get bundled
// into the Node runtime chunks, never into the edge middleware bundle.

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
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        // Verify the user still exists in the DB (handles DB wipe / re-seed).
        // Cached in Redis with a 60 s TTL so authenticated routes don't hit
        // Postgres on every request. If Redis is unreachable, cacheGet/cacheSet
        // fall through to null and we degrade gracefully to the old behavior.
        //
        // Dynamic import (not a top-level import) — see the note at the top
        // of this file: `@/lib/redis` must not be pulled into the edge
        // middleware bundle. The session callback only runs on Node runtime
        // (server components + API routes), so the dynamic import is safe.
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
          // Force sign-out by returning an empty session
          session.user.id = "";
          session.user.role = "USER" as Role;
          return session;
        }
        session.user.id = cached.row.id;
        session.user.role = cached.row.role;
      }
      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdmin = auth?.user?.role === "ADMIN";
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");
      const isCheckoutRoute = nextUrl.pathname.startsWith("/checkout");
      const isAuthRoute =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");

      if (isAdminRoute && !isAdmin) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      if ((isDashboardRoute || isCheckoutRoute) && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
});
