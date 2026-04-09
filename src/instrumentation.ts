// Next.js 15 instrumentation hook — called once per runtime (nodejs + edge)
// when the server boots. We lazy-import the matching Sentry config so each
// runtime gets its own isolated SDK init without cross-bundling.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Hooks Next.js server-side errors (route handlers, server components, server
// actions) directly into Sentry. Without this, request-time errors would only
// surface in server logs.
export const onRequestError = Sentry.captureRequestError;
