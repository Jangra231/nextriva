"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    /* Log the real error so the server/browser console surfaces the actual cause
       instead of the generic "We could not load this page." message. */
    console.error("[GlobalError]", error?.message, error?.stack, error?.digest);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#fbfaf6", color: "#16211d" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 440, textAlign: "center" }}>
            <p style={{ color: "#f65f4a", fontWeight: 700 }}>Nexriva</p>
            <h1 style={{ margin: "8px 0 12px" }}>We could not load this page.</h1>
            <p style={{ color: "#65716a", lineHeight: 1.6 }}>
              An unexpected error occurred. You can try again or return to the home page.
            </p>
            {error?.digest ? (
              <p style={{ color: "#999", fontSize: 12, marginTop: 8 }}>
                Error ID: {error.digest}
              </p>
            ) : null}
            <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => retry()}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  color: "white",
                  background: "#f65f4a",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <a
                href="/"
                style={{
                  display: "inline-block",
                  padding: "12px 16px",
                  borderRadius: 10,
                  color: "#16211d",
                  background: "#e8e6df",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Return home
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
