"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { CTAButton } from "@/components/ui/CTAButton";

gsap.registerPlugin(ScrollTrigger);

const BOWL_SIZE = 1080;

// ─── Scroll choreography config ───────────────────────────────────────────────
// Load-bearing "feel" values. The section pins via native position: sticky (NOT
// GSAP pin) so there is no fixed-position handoff frame with Lenis — nothing to
// "feel" at engage/release. A no-pin ScrollTrigger only reads 0→1 progress and
// drives the horizontal sweep + intra-window parallax.
const TRACK_VH = 320; // scroll distance: ~3 screen-heights to complete the sweep
const SCRUB = 0.5; // small — Lenis already smooths; avoid double-lag floatiness
const PARALLAX_STRENGTH = 0.16; // bowl lag depth; higher = slower bowl, more drama
const BOWL_OVERFLOW = 1.6; // bowl box width as a fraction of window width (room to lag)
const WINDOW = { aspectW: 1, aspectH: 1 }; // square frames
const CARD_HEIGHT = "clamp(320px, 58vh, 540px)"; // taller cards; width derives from aspect

const STAGE_VH = 100; // sticky stage height; used to locate the pin within the transit

// Row position (fraction of viewport width) at the exact moments the sticky
// stage engages and releases the pin. The sweep is linearly extrapolated BEYOND
// these two points across the section's full viewport transit, so the row is
// already gliding before the section pins and keeps gliding through the release
// (while the next section rises) — the pin boundaries are no longer motion
// boundaries. engageVw = row shifted left (right-side windows visible);
// releaseVw = row shifted right (left-side windows exiting). Tuned in-browser.
const SWEEP = { engageVw: 0.85, releaseVw: 0.15 };

const WINDOWS: { src: string; alt: string }[] = [
  { src: "/images-web/Transparent/Plain.png", alt: "The Plain bowl" },
  { src: "/images-web/Transparent/Bounty.png", alt: "" },
  { src: "/images-web/Transparent/Tropic.png", alt: "" },
  { src: "/images-web/Transparent/Moment.png", alt: "" },
  { src: "/images-web/Transparent/Silk.png", alt: "" },
  { src: "/images-web/Transparent/Bloom.png", alt: "" },
  { src: "/images-web/Transparent/Crunch.png", alt: "" },
];

const STATIC_BOWL = {
  src: "/images-web/Transparent/Bounty.png",
  alt: "The Bounty bowl",
};

export function BuildSection() {
  // ── Scroll (desktop/tablet) refs ──────────────────────────────────────────
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const windowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bowlRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Static (mobile / reduced-motion) refs ─────────────────────────────────
  const staticSectionRef = useRef<HTMLElement>(null);
  const staticEyebrowRef = useRef<HTMLParagraphElement>(null);
  const staticTitleRef = useRef<HTMLHeadingElement>(null);
  const staticImageRef = useRef<HTMLDivElement>(null);
  const staticCtaRef = useRef<HTMLDivElement>(null);

  const [layoutMode, setLayoutMode] = useState<"pending" | "static" | "scroll">("pending");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mqMobile = window.matchMedia("(max-width: 639px)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const mobile = mqMobile.matches;
      const reduced = mqMotion.matches;
      setPrefersReducedMotion(reduced);
      setLayoutMode(mobile || reduced ? "static" : "scroll");
    };
    update();
    mqMobile.addEventListener("change", update);
    mqMotion.addEventListener("change", update);
    return () => {
      mqMobile.removeEventListener("change", update);
      mqMotion.removeEventListener("change", update);
    };
  }, []);

  const useScrollAnimation = layoutMode === "scroll";
  const useMobileReveal = layoutMode === "static" && !prefersReducedMotion;
  const revealHiddenStyle = useMobileReveal ? { opacity: 0 } : undefined;

  // ── Desktop / tablet: sticky horizontal-parallax sweep ────────────────────
  useGSAP(
    () => {
      if (!useScrollAnimation || !trackRef.current || !rowRef.current) return;

      const row = rowRef.current;
      const windows = windowRefs.current.filter(Boolean) as HTMLDivElement[];
      const bowls = bowlRefs.current.filter(Boolean) as HTMLDivElement[];

      // Center each bowl on its own axis; parallax x is composed on top of this.
      gsap.set(bowls, { xPercent: -50 });

      const setRowX = gsap.quickSetter(row, "x", "px") as (v: number) => void;
      const setBowlX = bowls.map(
        (b) => gsap.quickSetter(b, "x", "px") as (v: number) => void
      );

      // The trigger spans the whole transit ("top bottom" → "bottom top"), so the
      // pin engages/releases at these interior progress fractions (derived from
      // track vs stage height): entry is the first `engP`, the stuck phase the
      // middle, exit the tail. We map the sweep in real px against those two
      // interior anchors and extrapolate outward, giving free runway on both ends.
      const engP = STAGE_VH / (TRACK_VH + STAGE_VH);
      const relP = TRACK_VH / (TRACK_VH + STAGE_VH);

      let vw = window.innerWidth;
      let baseX = 0; // row x at the pin-engage anchor (engP)
      let slope = 0; // row x change per unit progress

      const measure = () => {
        vw = window.innerWidth;
        const rowW = row.scrollWidth;
        const engageX = vw * SWEEP.engageVw - rowW; // row x when pin engages
        const releaseX = vw * SWEEP.releaseVw; // row x when pin releases
        slope = (releaseX - engageX) / (relP - engP);
        baseX = engageX;
      };

      const applyProgress = (p: number) => {
        setRowX(baseX + slope * (p - engP));
        // Per-window parallax: the bowl lags its frame based on where that frame
        // currently sits relative to viewport center (locomotive-style, so it is
        // consistent regardless of sweep position). Measuring the parent window's
        // post-transform rect is safe — the bowl's own x never feeds back into it.
        for (let i = 0; i < windows.length; i++) {
          const rect = windows[i].getBoundingClientRect();
          const offset = rect.left + rect.width / 2 - vw / 2;
          setBowlX[i](-offset * PARALLAX_STRENGTH);
        }
      };

      measure();

      const st = ScrollTrigger.create({
        trigger: trackRef.current,
        start: "top bottom", // section top enters from the viewport bottom
        end: "bottom top", // section bottom exits past the viewport top
        scrub: SCRUB,
        onUpdate: (self) => applyProgress(self.progress),
        onRefresh: (self) => {
          measure();
          applyProgress(self.progress);
        },
      });

      applyProgress(0);

      // Title stack: slow, staggered reveal-in as the section approaches
      // (brand motion: ~1.1s, ease-out, descending hierarchy).
      const titleTargets = [eyebrowRef.current, headlineRef.current, ctaRef.current];
      gsap.set(titleTargets, { opacity: 0, y: 18 });
      gsap.to(titleTargets, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: { trigger: trackRef.current, start: "top 85%", once: true },
      });

      // This section swaps from a short static layout into a tall (TRACK_VH)
      // sticky one on mount, after sections below have already measured their
      // ScrollTriggers against the shorter layout. Refresh so they re-measure.
      requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => st.kill();
    },
    { scope: sectionRef, dependencies: [useScrollAnimation] }
  );

  // ── Mobile: one-time stagger reveal on scroll into view ───────────────────
  useGSAP(
    () => {
      if (!useMobileReveal || !staticSectionRef.current) return;

      const targets = [
        staticEyebrowRef.current,
        staticTitleRef.current,
        staticImageRef.current,
        staticCtaRef.current,
      ].filter(Boolean);

      gsap.set(targets, { opacity: 0, y: 28 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.75,
        stagger: 0.14,
        ease: "power2.out",
        scrollTrigger: {
          trigger: staticSectionRef.current,
          start: "top 78%",
          once: true,
        },
      });
    },
    { scope: staticSectionRef, dependencies: [useMobileReveal] }
  );

  // ── Static layout: mobile, reduced-motion, and initial pending paint ───────
  if (!useScrollAnimation) {
    return (
      <section
        ref={staticSectionRef}
        className="relative w-full bg-cream overflow-hidden py-20 px-[7vw]"
        aria-label="Build A Bowl"
      >
        <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
          <p
            ref={staticEyebrowRef}
            className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]"
            style={revealHiddenStyle}
          >
            Build A Bowl
          </p>

          <h2
            ref={staticTitleRef}
            className="font-headline text-midnight leading-[1.05] uppercase mt-3"
            style={{ fontSize: "clamp(2rem, 9vw, 3.25rem)", ...revealHiddenStyle }}
          >
            Create Your Perfect Bowl.
          </h2>

          <div
            ref={staticImageRef}
            className="mt-8 w-full"
            style={{ maxWidth: "min(72vw, 18rem)", aspectRatio: "1 / 1", ...revealHiddenStyle }}
          >
            <Image
              src={STATIC_BOWL.src}
              alt={STATIC_BOWL.alt}
              width={BOWL_SIZE}
              height={BOWL_SIZE}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              priority
            />
          </div>

          <div ref={staticCtaRef} className="mt-8" style={revealHiddenStyle}>
            <CTAButton href="/build" variant="dark">
              Build Your Custom Bowl
            </CTAButton>
          </div>
        </div>
      </section>
    );
  }

  // ── Animated layout (desktop / tablet) ────────────────────────────────────
  return (
    <section ref={sectionRef} id="st-section" className="bg-cream" aria-label="Build A Bowl">
      <div ref={trackRef} style={{ position: "relative", height: `${TRACK_VH}vh` }}>
        <div
          ref={stageRef}
          className="bg-cream"
          style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}
        >
          {/* Title stack — pinned to the top while the stage is stuck */}
          <div
            style={{
              position: "absolute",
              top: "10vh",
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              zIndex: 10,
              pointerEvents: "none",
              padding: "0 1.5rem",
            }}
          >
            <p
              ref={eyebrowRef}
              className="font-body-caps text-midnight/50"
              style={{ fontSize: "0.7rem", letterSpacing: "0.30em", marginBottom: "0.9rem", willChange: "transform, opacity" }}
            >
              Build A Bowl
            </p>
            <h2
              ref={headlineRef}
              className="font-headline text-midnight"
              style={{
                fontSize: "clamp(1.75rem, 4.75vw, 4.25rem)",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
                willChange: "transform, opacity",
              }}
            >
              CREATE YOUR PERFECT BOWL.
            </h2>
            <div
              ref={ctaRef}
              style={{ marginTop: "1.75rem", pointerEvents: "auto", willChange: "transform, opacity" }}
            >
              <CTAButton href="/build" variant="dark">
                Build Your Custom Bowl
              </CTAButton>
            </div>
          </div>

          {/* Sweeping row of soft-blue clipping windows */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "34vh",
              bottom: "4vh",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              ref={rowRef}
              style={{
                display: "flex",
                gap: "6vw",
                width: "max-content",
                paddingLeft: "6vw",
                paddingRight: "6vw",
                willChange: "transform",
              }}
            >
              {WINDOWS.map((w, i) => (
                <div
                  key={w.src}
                  ref={(el) => {
                    windowRefs.current[i] = el;
                  }}
                  style={{
                    flex: "none",
                    height: CARD_HEIGHT,
                    width: "auto",
                    aspectRatio: `${WINDOW.aspectW} / ${WINDOW.aspectH}`,
                    position: "relative",
                    overflow: "hidden",
                    backgroundColor: "var(--color-blue)",
                  }}
                >
                  <div
                    ref={(el) => {
                      bowlRefs.current[i] = el;
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: "50%",
                      width: `${BOWL_OVERFLOW * 100}%`,
                      willChange: "transform",
                    }}
                  >
                    <Image
                      src={w.src}
                      alt={w.alt}
                      width={BOWL_SIZE}
                      height={BOWL_SIZE}
                      loading="eager"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "center",
                        display: "block",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
