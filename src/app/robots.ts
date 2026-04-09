import type { MetadataRoute } from "next";

// Base URL with sensible fallback for local/dev builds.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
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
          "/_next/",
          "/reset-password/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
