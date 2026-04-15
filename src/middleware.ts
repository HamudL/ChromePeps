import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // Block public access to the former COA listing. Certificates are sent
  // privately per e-mail with each order — the public route must redirect.
  if (req.nextUrl.pathname.startsWith("/analysezertifikate")) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  // For all other matched routes, NextAuth has already loaded the session;
  // returning nothing lets the request continue.
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
