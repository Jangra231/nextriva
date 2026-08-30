"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#fbfaf6", color: "#16211d" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 440, textAlign: "center" }}>
            <p style={{ color: "#f65f4a", fontWeight: 700 }}>Fitizen</p>
            <h1 style={{ margin: "8px 0 12px" }}>We could not load this page.</h1>
            <p style={{ color: "#65716a", lineHeight: 1.6 }}>Please return to the event discovery page and try again.</p>
            <a href="/" style={{ display: "inline-block", marginTop: 16, padding: "12px 16px", borderRadius: 10, color: "white", background: "#f65f4a", textDecoration: "none", fontWeight: 700 }}>Return home</a>
          </section>
        </main>
      </body>
    </html>
  );
}
