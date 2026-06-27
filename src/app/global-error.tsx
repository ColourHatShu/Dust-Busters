"use client";

// Root-level error boundary. It replaces the root layout, so global CSS is not
// guaranteed — keep styling inline. Must render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#070b14",
          color: "#e2e8f0",
        }}
      >
        <div style={{ maxWidth: "28rem", padding: "1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#94a3b8", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
            A critical error occurred while loading Dust Busters. Please try again.
            {error?.digest ? ` (ref: ${error.digest})` : ""}
          </p>
          <button
            onClick={() => reset()}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.75rem 1.5rem",
              fontWeight: 600,
              color: "#fff",
              background: "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
