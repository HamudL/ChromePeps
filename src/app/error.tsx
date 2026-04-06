"use client";

/**
 * Page-level error boundary — catches errors in page components.
 * Shows a useful error message with stack trace for debugging.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[PageError]", error.message, error.stack);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-4 text-center">
        <h2 className="text-2xl font-bold text-destructive">
          Something went wrong
        </h2>
        <p className="text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Digest: <code>{error.digest}</code>
          </p>
        )}
        {error.stack && (
          <pre className="text-left bg-muted rounded-lg p-4 overflow-auto text-xs max-h-60 mt-4">
            {error.stack}
          </pre>
        )}
        <button
          onClick={reset}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
