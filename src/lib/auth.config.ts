import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe NextAuth config.
 *
 * This file MUST NOT import anything that relies on Node-only APIs
 * — no Prisma client, no ioredis, no `bcryptjs`, no `fs`/`crypto`
 * beyond what Edge Runtime polyfills. The purpose is to be safely
 * importable from `src/middleware.ts` (which runs on Edge) without
 * dragging a Node runtime into the edge bundle.
 *
 * The real auth implementation lives in `src/lib/auth.ts`, which
 * extends this config with the Prisma adapter, the full Credentials
 * `authorize` function (bcrypt + DB lookup), and the `session`
 * callback (Redis cache + user-exists DB check). That file is only
 * used from Node contexts (server components, API routes, RSC).
 *
 * Why this split matters: NextAuth's middleware helper runs the
 * `session` and `jwt` callbacks from the imported config. If those
 * touch `ioredis` or Prisma — even via dynamic import — the Edge
 * runtime fails to load them, the callback throws, and the `auth`
 * object passed to `authorized` becomes null. The middleware then
 * treats every authenticated user as a guest and redirects them to
 * `/login` when they try to reach `/checkout`, `/dashboard`, or any
 * other protected route. That was the bug reported as "login screen
 * keeps reappearing even though I'm logged in".
 */

// The type module-augmentation for Session/User/JWT lives in auth.ts
// (the file that actually wires NextAuth up at runtime). We repeat
// `Role` only in the callback signature below — no runtime cost.

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // Credentials provider is DECLARED here so the middleware's
    // bundled config has the same provider shape as the real config
    // — NextAuth uses the provider list to build the auth URLs. The
    // actual `authorize` function in this edge config is a no-op
    // (always rejects) because middleware never calls it. The real
    // implementation lives in src/lib/auth.ts and only runs in Node
    // via the /api/auth/callback/credentials route.
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async () => null,
    }),
  ],
  callbacks: {
    // jwt runs on every request and MUST be edge-safe. Keep it pure:
    // copy user → token on sign-in, no DB or Redis access.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        // `role` is added to next-auth's User via module
        // augmentation in src/lib/auth.ts. That augmentation is
        // picked up globally by TypeScript, so we don't need a
        // type assertion here.
        token.role = user.role;
      }
      return token;
    },

    // session is what the `authorized` callback below receives as
    // `auth`. NextAuth's default copies only name/email/image from
    // the token, so if we don't explicitly copy `id` and `role`
    // here the middleware's role check (`auth.user.role === "ADMIN"`)
    // would read `undefined` and every admin would be redirected to
    // /login when trying to reach /admin. Must stay edge-safe — no
    // DB/Redis. The Node-side session callback in src/lib/auth.ts
    // overrides this one to also do the "user still exists" DB
    // verify with a Redis cache in front.
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },

    // authorized runs in middleware on every matched route. It
    // receives the `auth` object derived from the session (populated
    // by the session + jwt callbacks above). It must be edge-safe
    // and synchronous-equivalent (no DB/cache calls).
    async authorized({ auth, request: { nextUrl } }) {
      const role = auth?.user?.role as Role | undefined;
      const isLoggedIn = !!auth?.user;
      const isAdmin = role === "ADMIN";
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
} satisfies NextAuthConfig;
