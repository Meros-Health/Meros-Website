"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useLenis } from "@/components/animation/LenisProvider";
import {
  HERO_RIGHT_IMAGE_SRC,
  HERO_LOGO_DARK_SRC,
  HERO_LOGO_LIGHT_SRC,
} from "@/lib/heroAssets";

// ── Tunables ──────────────────────────────────────────────────────────────
const MIN_DISPLAY_MS = 500; // floor so the skeleton never flashes for a single frame
const FADE_OUT_MS = 600;    // overlay opacity transition — kept in sync with the inline style below

// Default true so anything consuming this outside a <Preloader> (or during
// its own unmount) never gets stuck waiting on a gate that isn't there.
const PreloadReadyContext = createContext(true);

/** Hero entrance animations key off this so they start when the gate lifts, not on mount. */
export function usePreloadReady() {
  return useContext(PreloadReadyContext);
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // a failed asset shouldn't hold the whole site hostage
    img.src = src;
  });
}

export function Preloader({ children }: { children: React.ReactNode }) {
  const lenis = useLenis();
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(true);

  // Preload the hero's critical assets once, independent of Lenis being ready.
  useEffect(() => {
    let cancelled = false;
    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, MIN_DISPLAY_MS));
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    // Gate only on the hero's above-the-fold assets. Carousel imagery is left
    // to lazy-load so the gate never stalls on the full image set.
    Promise.all([
      preloadImage(HERO_RIGHT_IMAGE_SRC),
      preloadImage(HERO_LOGO_DARK_SRC),
      preloadImage(HERO_LOGO_LIGHT_SRC),
      fontsReady,
      minDelay,
    ]).then(() => {
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
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(1rem, 3vw, 2rem)",
            background: "var(--color-cream)",
            opacity: ready ? 0 : 1,
            pointerEvents: ready ? "none" : "auto",
            transition: `opacity ${FADE_OUT_MS}ms ease`,
          }}
        >
          {/* Skeleton mirrors the hero's layout: logo lockup block, then the subtitle bar. */}
          <div
            className="skeleton-pulse"
            style={{
              width: "clamp(280px, 62vw, 1200px)",
              height: "calc(clamp(280px, 62vw, 1200px) / 2.485)",
              background: "rgba(41, 45, 42, 0.12)",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "clamp(200px, 28vw, 380px)",
              height: "clamp(0.8rem, 1.3vw, 1rem)",
              background: "rgba(41, 45, 42, 0.12)",
              animationDelay: "0.15s",
            }}
          />
        </div>
      )}
    </PreloadReadyContext.Provider>
  );
}
