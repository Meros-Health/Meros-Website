"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Image from "next/image";
import { useLenis } from "@/components/animation/LenisProvider";
import { waitForCriticalImages } from "@/lib/criticalImages";

// ── Tunables ──────────────────────────────────────────────────────────────
const MIN_DISPLAY_MS = 300; // floor so the mark never flashes for a single frame
const FADE_OUT_MS = 600;    // overlay opacity transition, kept in sync with the inline style below

// The square MERŌS mark, the same file the nav bar carries.
const MARK_SRC = "/logos/logo-dark.png";
const MARK_PX = 1376;

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
    // "/", the first menu cards on "/menu"). Everything else lazy-loads, so
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
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-cream)",
            opacity: ready ? 0 : 1,
            pointerEvents: ready ? "none" : "auto",
            transition: `opacity ${FADE_OUT_MS}ms ease`,
          }}
        >
          {/* The mark alone, scaling on a fixed loop (.preloader-mark in
              globals.css). `priority` so it is preloaded from the document
              head: this is the only thing on screen while the gate holds, and
              a preloader that has not loaded is a blank cream field. */}
          <Image
            src={MARK_SRC}
            alt=""
            aria-hidden
            width={MARK_PX}
            height={MARK_PX}
            priority
            sizes="(max-width: 1023px) 128px, 192px"
            className="preloader-mark"
          />
        </div>
      )}
    </PreloadReadyContext.Provider>
  );
}
