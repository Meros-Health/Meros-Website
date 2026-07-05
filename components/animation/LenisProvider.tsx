"use client";

import { useEffect, useState, createContext, useContext } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

// Site-wide scroll feel — single place to tune calmness.
// lerp replaces duration/easing for wheel smoothing (per Lenis docs).
const SCROLL_CONFIG = {
  lerp: 0.065,
  wheelMultiplier: 0.72,
  touchMultiplier: 0.82,
  smoothWheel: true,
  /** Cap aggressive trackpad/wheel spikes per event */
  maxWheelDelta: 90,
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

    // Bridge Lenis scroll position to GSAP ScrollTrigger.
    // ScrollTrigger reads window.scrollY by default; Lenis virtualises scroll so
    // we must forward its scroll events into ScrollTrigger's update cycle.
    instance.on("scroll", ScrollTrigger.update);

    // Run Lenis inside GSAP's ticker so both are in sync on the same rAF.
    // Using gsap.ticker instead of requestAnimationFrame avoids drift.
    const tickerCallback = (time: number) => {
      instance.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerCallback);
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
