import type { MetadataRoute } from "next";

// Force dynamic evaluation so the base URL is read from the running
// container's env (via docker-compose env_file) instead of being frozen
// at build time — NEXT_PUBLIC_* build-arg propagation through Compose is
// brittle, runtime lookup is reliable.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // Base URL with sensible fallback for local/dev builds.
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/checkout",
          "/cart",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/reset-password/",
          "/analysezertifikate",
          "/analysezertifikate/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
