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
 *
 * Styling: bewusst nur Inline-Styles mit System-Fonts — globals.css und
 * die Font-Provider sind hier nicht verfügbar. Farbwerte entsprechen den
 * „Chromatogramm"-Tokens (Nachtblau-Ink, Viridian-Akzent).
 */
const isDev = process.env.NODE_ENV === "development";

// Token-Hexwerte (Ink/Viridian) — hartkodiert, weil CSS-Variablen aus
// globals.css in diesem Boundary nicht geladen sind.
const INK = "#0c1220";
const INK_CARD = "#101828";
const INK_BORDER = "#1d2738";
const INK_FOREGROUND = "#e6eaf0";
const INK_MUTED = "#8b94a3";
const VIRIDIAN = "#0e6457";
const MINT = "#46c2a5";
const RED = "#d4555f";

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

  const monoLabel: React.CSSProperties = {
    fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
    fontSize: "11px",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
  };

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
          background: INK,
          color: INK_FOREGROUND,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            padding: "2.5rem",
            border: `1px solid ${INK_BORDER}`,
            borderRadius: "4px",
            background: INK_CARD,
          }}
        >
          {/* Protokoll-Kopfzeile */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              paddingBottom: "1rem",
              borderBottom: `1px solid ${INK_BORDER}`,
            }}
          >
            <span style={{ ...monoLabel, color: INK_MUTED }}>
              Analyse-Protokoll
            </span>
            <span style={{ ...monoLabel, color: RED }}>Systemfehler</span>
          </div>

          <h1
            style={{
              margin: "1.5rem 0 0",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 500,
              fontSize: "1.9rem",
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            Messung <em style={{ color: MINT }}>unterbrochen</em>.
          </h1>
          <p
            style={{
              margin: "0.9rem 0 0",
              color: INK_MUTED,
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
          >
            {isDev
              ? error.message || "Ein unerwarteter Fehler ist aufgetreten."
              : "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support."}
          </p>
          {error.digest && (
            <p style={{ ...monoLabel, margin: "1.1rem 0 0", color: INK_MUTED }}>
              Referenz:{" "}
              <code style={{ textTransform: "none" }}>{error.digest}</code>
            </p>
          )}
          {isDev && error.stack && (
            <pre
              style={{
                background: "#080d17",
                color: INK_FOREGROUND,
                border: `1px solid ${INK_BORDER}`,
                padding: "1rem",
                borderRadius: "2px",
                overflow: "auto",
                fontSize: "0.75rem",
                lineHeight: 1.6,
                marginTop: "1.25rem",
                maxHeight: "300px",
              }}
            >
              {error.stack}
            </pre>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              padding: "0.7rem 1.5rem",
              background: VIRIDIAN,
              color: "#f2f8f7",
              border: `1px solid ${VIRIDIAN}`,
              borderRadius: "2px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
