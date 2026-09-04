"use client";

import { useEffect, useState, createContext, useContext } from "react";
import Lenis from "lenis";
import { setScrollController } from "@/lib/scrollLock";

const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

// Site-wide scroll feel: single place to tune calmness.
// lerp replaces duration/easing for wheel smoothing (per Lenis docs).
const SCROLL_CONFIG = {
  lerp: 0.12,
  wheelMultiplier: 1.0,
  touchMultiplier: 1.0,
  smoothWheel: true,
  /** Cap aggressive trackpad/wheel spikes per event */
  maxWheelDelta: 240,
} as const;

interface LenisProviderProps {
  children: React.ReactNode;
}

export function LenisProvider({ children }: LenisProviderProps) {
  // Held in state (not a ref) so consumers re-render and receive the instance
  // once it exists. A ref would leave every useLenis() consumer stuck at null.
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const instance = new Lenis({
      lerp: SCROLL_CONFIG.lerp,
      wheelMultiplier: SCROLL_CONFIG.wheelMultiplier,
      touchMultiplier: SCROLL_CONFIG.touchMultiplier,
      smoothWheel: SCROLL_CONFIG.smoothWheel,
      virtualScroll: (data) => {
        const cap = SCROLL_CONFIG.maxWheelDelta;
        if (Math.abs(data.deltaY) > cap) {
          data.deltaY = Math.sign(data.deltaY) * cap;
        }
        if (Math.abs(data.deltaX) > cap) {
          data.deltaX = Math.sign(data.deltaX) * cap;
        }
        return true;
      },
    });

    setLenis(instance);
    // Overlays lock scrolling through lib/scrollLock.ts, which stops and
    // starts this instance alongside the native overflow lock.
    setScrollController(instance);

    // ── The rAF driver, in two phases ──────────────────────────────────────
    // This provider is in the root layout, so anything it imports at module
    // scope ships on every route. GSAP is 44 kB gzipped and /privacy, /terms,
    // /menu, /build, /checkout and /catering never animate with it, so it is
    // loaded here asynchronously instead.
    //
    // That creates a gap: Lenis needs a rAF driver on the very first frame,
    // and the import resolves a frame or two later. So phase one is a native
    // loop that starts now, and phase two hands the drive over to gsap.ticker
    // once GSAP arrives. The handoff matters: ScrollTrigger runs on gsap's
    // ticker, and leaving Lenis on a second independent rAF loop lets the two
    // drift by a frame under load, which is visible on scrubbed animations.
    let cancelled = false;
    let rafId = requestAnimationFrame(function nativeRaf(time) {
      instance.raf(time);
      rafId = requestAnimationFrame(nativeRaf);
    });
    let detachTicker: (() => void) | null = null;

    void (async () => {
      const [gsapModule, scrollTriggerModule] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      // The effect can be torn down while those two are in flight.
      if (cancelled) return;

      const { gsap } = gsapModule;
      const { ScrollTrigger } = scrollTriggerModule;
      gsap.registerPlugin(ScrollTrigger);

      // Bridge Lenis scroll position to GSAP ScrollTrigger.
      // ScrollTrigger reads window.scrollY by default; Lenis virtualises scroll
      // so we must forward its scroll events into ScrollTrigger's update cycle.
      instance.on("scroll", ScrollTrigger.update);

      // Phase two: one ticker drives both.
      cancelAnimationFrame(rafId);
      const tickerCallback = (time: number) => {
        instance.raf(time * 1000);
      };
      gsap.ticker.add(tickerCallback);
      gsap.ticker.lagSmoothing(0);
      detachTicker = () => gsap.ticker.remove(tickerCallback);
    })();

    return () => {
      cancelled = true;
      // A no-op if phase two already cancelled it, or if the id has elapsed.
      cancelAnimationFrame(rafId);
      detachTicker?.();
      setScrollController(null);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return (
    <LenisContext.Provider value={lenis}>
      {children}
    </LenisContext.Provider>
  );
}
