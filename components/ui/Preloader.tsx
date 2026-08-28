"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useLenis } from "@/components/animation/LenisProvider";
import { waitForCriticalImages } from "@/lib/criticalImages";

// ── Tunables ──────────────────────────────────────────────────────────────
const MIN_DISPLAY_MS = 300; // floor so the skeleton never flashes for a single frame
const FADE_OUT_MS = 600;    // overlay opacity transition, kept in sync with the inline style below

// Default true so anything consuming this outside a <Preloader> (or during
// its own unmount) never gets stuck waiting on a gate that isn't there.
const PreloadReadyContext = createContext(true);

/** Hero entrance animations key off this so they start when the gate lifts, not on mount. */
export function usePreloadReady() {
  return useContext(PreloadReadyContext);
}

export function Preloader({ children }: { children: React.ReactNode }) {
  const lenis = useLenis();
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(true);

  // Wait for the route's critical images once, independent of Lenis being ready.
  useEffect(() => {
    let cancelled = false;
    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, MIN_DISPLAY_MS));
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    // Gate only on the images the current route marked critical (the hero on
    // "/", the first menu cards on "/order"). Everything else lazy-loads, so
    // the gate never stalls on the full image set, and a route with nothing
    // marked pays only the floor.
    Promise.all([waitForCriticalImages(), fontsReady, minDelay]).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Hold scroll locked until the gate lifts (Lenis may mount a beat after this component).
  useEffect(() => {
    if (!ready) lenis?.stop();
  }, [lenis, ready]);

  // Once ready: release scroll, then unmount the overlay after its fade-out finishes.
  useEffect(() => {
    if (!ready) return;
    lenis?.start();
    const timeout = setTimeout(() => setMounted(false), FADE_OUT_MS);
    return () => clearTimeout(timeout);
  }, [ready, lenis]);

  return (
    <PreloadReadyContext.Provider value={ready}>
      {children}

      {mounted && (
        <div
          aria-hidden={ready}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            display: "flex",
            flexDirection: "column",
            background: "var(--color-cream)",
            opacity: ready ? 0 : 1,
            pointerEvents: ready ? "none" : "auto",
            transition: `opacity ${FADE_OUT_MS}ms ease`,
            padding: "clamp(1rem, 3vw, 2rem)",
            gap: "clamp(0.85rem, 1.4vw, 1.4rem)",
          }}
        >
          {/* Both variants render on the server and client alike; CSS media
              queries (not JS viewport state) decide which is visible, so the
              correct one is on screen from first paint, with no post-hydration flash. */}
          <div className="preloader-skeleton-desktop">
            <div style={{ flex: "1 1 0%", minHeight: 0, display: "flex", gap: "clamp(0.85rem, 1.4vw, 1.4rem)" }}>
              <div
                className="skeleton-pulse"
                style={{
                  width: "50%",
                  height: "100%",
                  borderRadius: "0.5rem",
                  background: "rgba(41, 45, 42, 0.12)",
                }}
              />
              <div
                className="skeleton-pulse"
                style={{
                  width: "50%",
                  height: "100%",
                  borderRadius: "0.5rem",
                  background: "rgba(41, 45, 42, 0.12)",
                  animationDelay: "0.15s",
                }}
              />
            </div>
            <div
              className="skeleton-pulse"
              style={{
                width: "100%",
                height: "clamp(150px, 20vh, 260px)",
                flexShrink: 0,
                borderRadius: "0.5rem",
                background: "rgba(41, 45, 42, 0.12)",
                animationDelay: "0.3s",
              }}
            />
          </div>

          {/* Mobile hero has no split/carousel layout, just a centered title. */}
          <div className="preloader-skeleton-mobile">
            <div
              className="skeleton-pulse"
              style={{
                width: "clamp(220px, 72vw, 420px)",
                height: "clamp(88px, 29vw, 168px)",
                borderRadius: "0.5rem",
                background: "rgba(41, 45, 42, 0.12)",
              }}
            />
          </div>
        </div>
      )}
    </PreloadReadyContext.Provider>
  );
}
