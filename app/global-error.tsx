"use client";

import { useEffect } from "react";
import { BRAND } from "@/lib/design/colors";

// Last-resort boundary for errors thrown by the root layout itself. It
// replaces the whole document, so it carries its own html and body and uses
// no app components or fonts.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global error]", error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: BRAND.cream, color: BRAND.midnight, fontFamily: "system-ui, sans-serif" }}>
        <main style={{ padding: "9rem 7vw 6rem" }}>
          <h1 style={{ fontSize: "2.5rem", lineHeight: 1, textTransform: "uppercase", margin: 0 }}>
            Something Went Wrong
          </h1>
          <p style={{ marginTop: "1rem", maxWidth: "32rem", fontSize: "0.9rem" }}>
            The site could not be shown. Your cart is saved on this device.
          </p>
          {error.digest && (
            <p style={{ marginTop: "1rem", fontSize: "0.7rem", opacity: 0.5 }}>Reference: {error.digest}</p>
          )}
          <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: BRAND.midnight,
                color: BRAND.cream,
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
              href="/menu"
              style={{
                color: BRAND.midnight,
                border: "0.5px solid var(--rule-strong-midnight)",
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
