import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
  async headers() {
    // CSP: Next.js requires 'unsafe-inline' for hydration scripts and styles.
    // Plausible, Sentry tunnel, and image CDNs are explicitly allowed.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' analytics.chromepeps.com *.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: res.cloudinary.com images.unsplash.com *.edgeone.app *.google-analytics.com *.googletagmanager.com",
      "font-src 'self'",
      "connect-src 'self' analytics.chromepeps.com *.ingest.de.sentry.io *.google-analytics.com *.analytics.google.com *.googletagmanager.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.edgeone.app",
      },
    ],
  },
  // Ensure Prisma is resolved from node_modules at runtime (not bundled)
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Include Prisma engine binaries in standalone output trace
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/.prisma/**/*",
      "./node_modules/@prisma/client/**/*",
      "./node_modules/@prisma/engines/**/*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  output: "standalone",
};

// Wrap with Sentry — uploads source maps at build time so stack traces in the
// Sentry dashboard reference the original TypeScript instead of minified JS.
// The tunnelRoute "/monitoring" proxies Sentry ingest requests through our
// own origin so browser adblockers can't block error reporting.
export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  // Source-map upload credentials — read from env at build time.
  // If any are missing, the Sentry plugin falls back to a silent no-op so
  // local dev builds keep working even without the token.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload more client chunks (pages under /app) for better unminification.
  widenClientFileUpload: true,

  // After uploading to Sentry, delete the .map files from .next/ so we don't
  // ship them to the public. Sentry still has them for stack-trace resolution.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Bypass adblockers by routing ingest through our own origin.
  tunnelRoute: "/monitoring",

  // Be quiet in local builds; CI/VPS build sets CI=1 so logs surface there.
  silent: !process.env.CI,
});
