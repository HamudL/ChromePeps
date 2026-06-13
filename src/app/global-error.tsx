"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Global error boundary — catches errors in the root layout.
 * Must be a Client Component and must define its own <html>/<body>.
 *
 * Errors here bypass all other error.tsx boundaries, so this is our
 * last-chance funnel into Sentry: if the root layout itself blew up
 * (theme provider, fonts, JSON-LD serialization, etc.) we still want
 * a ticket in the dashboard instead of a silent white screen.
 */
const isDev = process.env.NODE_ENV === "development";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Forward the error to Sentry — useEffect guarantees it fires exactly
    // once per render and only in the browser, so we don't double-report.
    Sentry.captureException(error);
  }, [error]);

  // Also log to server console (visible in docker logs) for local debugging.
  console.error("[GlobalError]", error.message, error.stack);

  return (
    <html lang="de">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <div
          style={{
            maxWidth: "600px",
            margin: "4rem auto",
            padding: "2rem",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "#fafafa",
          }}
        >
          <h1 style={{ color: "#dc2626", marginBottom: "1rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#374151", marginBottom: "1rem" }}>
            {isDev
              ? error.message || "An unexpected error occurred."
              : "An unexpected error occurred. Please try again or contact support."}
          </p>
          {error.digest && (
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}
          {isDev && error.stack && (
            <pre
              style={{
                background: "#1f2937",
                color: "#f9fafb",
                padding: "1rem",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "0.75rem",
                marginTop: "1rem",
                maxHeight: "300px",
              }}
            >
              {error.stack}
            </pre>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1.5rem",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
