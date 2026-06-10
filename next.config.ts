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
    // Dev additionally requires 'unsafe-eval' because webpack's eval-source-map
    // devtool loads chunks via eval() — without it, the client bundle fails
    // silently and React never hydrates.
    // Plausible, Sentry tunnel, and image CDNs are explicitly allowed.
    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = [
      "script-src 'self' 'unsafe-inline'",
      isDev && "'unsafe-eval'",
      "analytics.chromepeps.com *.googletagmanager.com",
      // hCaptcha lädt sein Widget-JS von hcaptcha.com
      "https://hcaptcha.com https://*.hcaptcha.com",
    ]
      .filter(Boolean)
      .join(" ");
    const csp = [
      "default-src 'self'",
      scriptSrc,
      // hCaptcha-Widget bringt eigenes Stylesheet mit, hosted auf
      // hcaptcha.com.
      "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
      "img-src 'self' data: blob: res.cloudinary.com images.unsplash.com *.edgeone.app *.google-analytics.com *.googletagmanager.com",
      "font-src 'self'",
      // hCaptcha-Verify-Call geht an api.hcaptcha.com (server-side),
      // Widget kommuniziert clientseitig mit hcaptcha.com.
      "connect-src 'self' analytics.chromepeps.com *.ingest.de.sentry.io *.google-analytics.com *.analytics.google.com *.googletagmanager.com https://hcaptcha.com https://*.hcaptcha.com",
      // hCaptcha rendert das Challenge-UI in einem iframe von
      // hcaptcha.com — sonst kein Captcha-Solve möglich.
      "frame-src https://hcaptcha.com https://*.hcaptcha.com",
      "object-src 'none'",
      "base-uri 'self'",
      // CSP-Pendant zu X-Frame-Options: DENY — moderne Browser werten
      // frame-ancestors aus und ignorieren XFO, wenn beides gesetzt ist.
      "frame-ancestors 'none'",
      // form-action erlaubt POST-Submits an die eigene Origin und an
      // accounts.google.com. Letzteres ist nötig weil NextAuth den
      // OAuth-Flow per 302 von /api/auth/signin/google an Google's
      // accounts.google.com weiterreicht — unter `'self'` allein
      // blockiert der Browser den cross-origin-Redirect, das Form
      // hängt für immer im Pending-State (genau das Symptom „lädt
      // unendlich" beim Google-Button-Klick).
      "form-action 'self' https://accounts.google.com",
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
          // Frühes Anwerfen der TLS-Handshakes für Drittanbieter-Origins,
          // bevor der HTML-Parser bei den Script-Tags ankommt. Spart auf
          // Cold-Visits ~100-300ms LCP-Anteil (TCP+TLS+DNS für analytics +
          // Sentry-Tunnel + hCaptcha).
          {
            key: "Link",
            value: [
              "<https://analytics.chromepeps.com>; rel=preconnect",
              "<https://hcaptcha.com>; rel=preconnect",
              "<https://res.cloudinary.com>; rel=preconnect; crossorigin",
            ].join(", "),
          },
        ],
      },
      // Next.js Image-Optimizer-Output: lange immutable-Cache,
      // unterstützt Browser- und CDN-Caches.
      {
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Statische public/-Assets (Bilder, Vial-Frames, Fonts). Per
      // Default liefert Next sie mit Cache-Control: public,max-age=0.
      // Datei-Pfade enthalten keine Content-Hashes, daher 1 Tag
      // browser-cache + stale-while-revalidate für 7 Tage — Update
      // landet trotzdem schnell live, repeat-visits sparen Roundtrips.
      //
      // Bewusst auf `.webp` eingeschränkt (einziger Asset-Typ unter
      // public/ueber-uns/): der frühere Matcher `/ueber-uns/:path*`
      // traf auch die HTML-Route /ueber-uns selbst — Browser hielten
      // die SEITE 24 h im Cache, Content-Updates kamen bei Repeat-
      // Visitors erst einen Tag später an.
      {
        source: "/ueber-uns/:path*.webp",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/products/:path*.png",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/products/:path*.jpg",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/products/:path*.webp",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=86400, stale-while-revalidate=604800",
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
  // Unterdrücke Workspace-Root-Warnung — wir haben einen zweiten
  // lockfile außerhalb der Repo (C:\Users\HamudL\package-lock.json),
  // den Next sonst als Root rät und Trace-Pfade kaputt macht.
  outputFileTracingRoot: __dirname,
  // Eliminiert console.* in Production-Bundles (außer error/warn).
  // Spart ein paar KB und unterbindet versehentliches Debug-Leak.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // optimizePackageImports rewrites barrel imports so unused exports
    // tree-shake correctly. Largest impact bei lucide-react (>1000 Icons,
    // wir nutzen ~30) und Radix-Modulen (jedes ihrer Index-Files
    // re-exportiert die ganze Suite). Trifft direkt den 184 kB shared
    // chunk und die Per-Page Sizes.
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "date-fns",
      "recharts",
      "@react-pdf/renderer",
      "@react-email/components",
      "sonner",
    ],
    // Server-Side React-Komponenten optimiert kompilieren — schneller
    // RSC-Build, kleinere RSC-Payloads.
    optimizeServerReact: true,
    // Stellt die Scroll-Position bei Browser-Back/Forward-Navigation
    // wieder her (hat nichts mit Link-Prefetching zu tun).
    scrollRestoration: true,
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

  // Bundle-Größe optimieren: deaktiviert Sentry-Features die wir nicht
  // nutzen, schlankerer Client-Bundle. Replay/Debug-Builder ziehen den
  // SDK-Footprint hoch — wir tracen Errors, keine Session-Replays.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },

  // Webpack-Optionen — Sentry hat sie aus der Top-Level-Config in einen
  // eigenen Namespace verschoben (Deprecation-Warnings sonst).
  webpack: {
    // React-Komponenten-Annotation aus. Macht das HTML messbar größer
    // und ist nur für tiefere Sentry-React-Debugging-Features nötig.
    reactComponentAnnotation: { enabled: false },
    // Tree-shake `logger.*`-Aufrufe in Production.
    treeshake: { removeDebugLogging: true },
    // Vercel-Monitors auto-detection aus (wir sind nicht auf Vercel).
    automaticVercelMonitors: false,
  },
});
