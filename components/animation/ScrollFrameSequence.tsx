"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollFrameSequenceProps {
  /** Directory path under /public, e.g. "/frames/bowl-build" */
  frameDir: string;
  /** Total number of frames (0-indexed filenames: 0001.webp … NNNN.webp) */
  frameCount: number;
  /** Zero-padded digit width, default 4 → "0001.webp" */
  framePadding?: number;
  /** File extension, default "webp" */
  frameExt?: string;
  /** ScrollTrigger start, default "top top" */
  triggerStart?: string;
  /** ScrollTrigger end, default "+=300%" */
  triggerEnd?: string;
  /** Pin the container while scrubbing, default true */
  pin?: boolean;
  className?: string;
}

export function ScrollFrameSequence({
  frameDir,
  frameCount,
  framePadding = 4,
  frameExt = "webp",
  triggerStart = "top top",
  triggerEnd = "+=300%",
  pin = true,
  className = "",
}: ScrollFrameSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const buildPath = useCallback(
    (index: number) => {
      const padded = String(index).padStart(framePadding, "0");
      return `${frameDir}/${padded}.${frameExt}`;
    },
    [frameDir, framePadding, frameExt]
  );

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const frame = framesRef.current[index];
    if (!canvas || !frame) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = frame.naturalWidth;
    canvas.height = frame.naturalHeight;
    ctx.drawImage(frame, 0, 0);
  }, []);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Preload all frames
  useEffect(() => {
    let cancelled = false;
    const images: HTMLImageElement[] = [];
    let loaded = 0;
    let errored = false;

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = buildPath(i);
      images.push(img);

      img.onload = () => {
        if (cancelled) return;
        loaded++;
        if (loaded === frameCount && !errored) {
          framesRef.current = images;
          setLoadState("ready");
          drawFrame(0);
        }
      };

      img.onerror = () => {
        if (cancelled || errored) return;
        errored = true;
        console.error(`[ScrollFrameSequence] Failed to load frame: ${img.src}`);
        setLoadState("error");
      };
    }

    return () => {
      cancelled = true;
    };
  }, [frameDir, frameCount, buildPath, drawFrame]);

  // Wire ScrollTrigger scrub — skipped entirely if prefers-reduced-motion
  useGSAP(
    () => {
      if (loadState !== "ready" || prefersReducedMotion) return;

      const proxy = { frame: 0 };

      const st = ScrollTrigger.create({
        trigger: containerRef.current,
        start: triggerStart,
        end: triggerEnd,
        pin: pin,
        scrub: 0.5,
        onUpdate: (self) => {
          const frameIndex = Math.round(self.progress * (frameCount - 1));
          if (frameIndex !== currentFrameRef.current) {
            currentFrameRef.current = frameIndex;
            drawFrame(frameIndex);
          }
        },
      });

      // Suppress unused-variable warning — proxy is intentionally kept for
      // potential future gsap.to() tween-based scrubbing
      void proxy;

      return () => st.kill();
    },
    {
      scope: containerRef,
      dependencies: [loadState, prefersReducedMotion, frameCount, triggerStart, triggerEnd, pin],
    }
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {loadState === "loading" && (
        <div className="flex h-full w-full items-center justify-center bg-cream">
          <span className="font-subhead-caps text-juniper text-sm">Loading</span>
        </div>
      )}

      {loadState === "error" && (
        <div className="flex h-full w-full items-center justify-center bg-cream">
          <span className="font-subhead-caps text-grapefruit text-sm">
            Frame sequence unavailable
          </span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`h-full w-full object-cover ${loadState !== "ready" ? "hidden" : ""}`}
      />
    </div>
  );
}
