// Sentry Node.js SDK init — runs in the Next.js server runtime (server
// components, route handlers, server actions). Loaded from instrumentation.ts.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Performance monitoring — 10% of transactions in prod.
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

    // No PII — stay DSGVO-clean.
    sendDefaultPii: false,

    debug: false,
  });
}
