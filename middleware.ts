export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/checkout/:path*", "/login", "/register"],
};
