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

interface LenisProviderProps {
  children: React.ReactNode;
}

export function LenisProvider({ children }: LenisProviderProps) {
  // Held in state (not a ref) so consumers re-render and receive the instance
  // once it exists. A ref would leave every useLenis() consumer stuck at null.
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const instance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
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
