"use client";

import { useRef, RefObject } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface PinnedSectionOptions {
  /** How long the pin lasts. Can be a px amount ("+=200%") or "max". Default "+=200%" */
  pinDuration?: string;
  /** ScrollTrigger start. Default "top top" */
  start?: string;
  /** Scrub value: true for 1:1, number for smoothing lag. Default 1 */
  scrub?: boolean | number;
  /** Callback receiving progress [0–1] on each scroll update */
  onProgress?: (progress: number) => void;
  /** Additional ScrollTrigger config to merge in */
  extraConfig?: Partial<ScrollTrigger.Vars>;
}

interface PinnedSectionResult {
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Attaches a GSAP ScrollTrigger pin+scrub to the returned containerRef.
 * Drop onto any section component; no per-section GSAP config needed.
 *
 * Usage:
 *   const { containerRef } = usePinnedSection({ pinDuration: "+=300%" });
 *   return <section ref={containerRef}>...</section>;
 */
export function usePinnedSection({
  pinDuration = "+=200%",
  start = "top top",
  scrub = 1,
  onProgress,
  extraConfig = {},
}: PinnedSectionOptions = {}): PinnedSectionResult {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el) return;

      const st = ScrollTrigger.create({
        trigger: el,
        start,
        end: pinDuration,
        pin: true,
        scrub,
        onUpdate: onProgress ? (self) => onProgress(self.progress) : undefined,
        ...extraConfig,
      });

      return () => st.kill();
    },
    { scope: containerRef, dependencies: [pinDuration, start, scrub] }
  );

  return { containerRef };
}
