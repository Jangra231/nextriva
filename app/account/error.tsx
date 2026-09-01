"use client";

import { useEffect } from "react";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Account Error]", error.message, error.stack, error.digest);
  }, [error]);

  return (
    <div className="dashboard">
      <header className="dash-top">
        <a href="/" className="brand"><span className="brand-mark">N</span><span>nexriva</span></a>
      </header>
      <main className="dash-main" style={{ display: "grid", placeItems: "center", minHeight: "60vh", padding: 24 }}>
        <section style={{ maxWidth: 440, textAlign: "center" }}>
          <p style={{ color: "#f65f4a", fontWeight: 700 }}>Nexriva</p>
          <h1 style={{ margin: "8px 0 12px" }}>Something went wrong.</h1>
          <p style={{ color: "#65716a", lineHeight: 1.6 }}>
            We hit an unexpected issue loading this page. You can try again or return to your profile.
          </p>
          {error.digest ? <p style={{ color: "#999", fontSize: 12, marginTop: 8 }}>Error ID: {error.digest}</p> : null}
          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{ padding: "12px 16px", borderRadius: 10, color: "white", background: "#f65f4a", border: "none", fontWeight: 700, cursor: "pointer" }}
            >
              Try again
            </button>
            <a
              href="/account/profile"
              style={{ display: "inline-block", padding: "12px 16px", borderRadius: 10, color: "#16211d", background: "#e8e6df", textDecoration: "none", fontWeight: 700 }}
            >
              Go to profile
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}