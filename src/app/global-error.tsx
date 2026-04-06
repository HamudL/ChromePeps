"use client";

/**
 * Global error boundary — catches errors in the root layout.
 * Must be a Client Component and must define its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log to server console (visible in docker logs)
  console.error("[GlobalError]", error.message, error.stack);

  return (
    <html lang="en">
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
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest && (
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              Error digest: <code>{error.digest}</code>
            </p>
          )}
          {error.stack && (
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
