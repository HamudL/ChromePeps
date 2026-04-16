import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Build a LOCAL NextAuth instance from the edge-safe config only.
// DO NOT import { auth } from "@/lib/auth" here — that file pulls in
// the Prisma adapter, bcryptjs, and a dynamic Redis import in the
// session callback, all of which are Node-only. Importing them from
// the middleware bundle caused the session callback to throw silently
// at runtime; the `auth` object passed to `authorized` came back null,
// and every logged-in user was redirected to /login when they tried
// to reach /checkout, /dashboard, or any other protected route.
//
// This pattern — one tiny NextAuth() in middleware, one full
// NextAuth() in the Node-side auth.ts — is the canonical v5 split
// for supporting Edge middleware.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Block public access to the former COA listing. Certificates are sent
  // privately per e-mail with each order — the public route must redirect.
  if (req.nextUrl.pathname.startsWith("/analysezertifikate")) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  // For all other matched routes, NextAuth's `authorized` callback has
  // already had a chance to enforce login/role checks. Returning
  // nothing lets the request continue.
});

export const config = {
  matcher: [
    "/analysezertifikate",
    "/analysezertifikate/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/checkout/:path*",
    "/login",
    "/register",
  ],
};
