"use client";

// Last-resort boundary for errors thrown by the root layout itself. It
// replaces the whole document, so it carries its own html and body and uses
// no app components or fonts.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fff7f0", color: "#292d2a", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ padding: "9rem 7vw 6rem" }}>
          <h1 style={{ fontSize: "2.5rem", lineHeight: 1, textTransform: "uppercase", margin: 0 }}>
            Something Went Wrong
          </h1>
          <p style={{ marginTop: "1rem", maxWidth: "32rem", fontSize: "0.9rem" }}>
            The site could not be shown. Your cart is saved on this device.
          </p>
          <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#292d2a",
                color: "#fff7f0",
                border: "none",
                padding: "0.75rem 2rem",
                fontSize: "0.65rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <a
              href="/order"
              style={{
                color: "#292d2a",
                border: "0.5px solid rgba(41,45,42,0.28)",
                padding: "0.75rem 2rem",
                fontSize: "0.65rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Our Menu
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
