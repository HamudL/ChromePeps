// Sentry browser SDK init — runs in the client bundle.
// The DSN is public by design (it only allows sending events, nothing else),
// so exposing it via NEXT_PUBLIC_* is fine and required for Sentry to boot.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Performance monitoring — 10% of transactions in prod to keep volume sane.
    // Dev captures everything so we can iterate quickly.
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

    // No session replay for now — can be enabled later if we need it.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Don't send default PII (IP, cookies) to stay DSGVO-clean.
    sendDefaultPii: false,

    // Silence the SDK's own console noise in prod.
    debug: false,
  });
}

// App Router navigation instrumentation — tracks client-side route changes
// so they show up as transactions in Sentry's performance view.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
