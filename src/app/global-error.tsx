"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#666", marginBottom: "1rem", maxWidth: "480px" }}>
            An unexpected error occurred.
          </p>
          <pre style={{ color: "#c00", fontSize: "0.75rem", maxWidth: "600px", overflow: "auto", textAlign: "left", padding: "1rem", background: "#f8f8f8", borderRadius: "0.5rem", marginBottom: "2rem" }}>
            {error.message}
            {"\n\n"}
            {error.stack}
          </pre>
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              borderRadius: "0.5rem",
              border: "1px solid #ccc",
              backgroundColor: "#000",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
