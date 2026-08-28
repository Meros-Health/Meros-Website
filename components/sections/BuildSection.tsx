"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { CTAButton } from "@/components/ui/CTAButton";
import { useRevealReady } from "@/lib/useRevealReady";

gsap.registerPlugin(ScrollTrigger);

const BOWL_SIZE = 1080;

// ─── Carousel config ──────────────────────────────────────────────────────────
// Load-bearing "feel" values. The row is NOT scroll-pinned; it runs as a
// continuous carousel driven by a single gsap.ticker loop. That loop advances the
// row rightward at a constant speed AND applies the per-window parallax (bowl lag)
// every frame. Because the parallax reads each window's live rect, it is identical
// in mechanism to the old scroll-driven version; only the row driver changed.
const CAROUSEL_SPEED_PX_PER_SEC = 48; // slower = more premium (brand motion guidance)
const PARALLAX_STRENGTH = 0.16; // bowl lag depth; higher = slower bowl, more drama
const BOWL_OVERFLOW = 1.6; // bowl box width as a fraction of window width (room to lag)
const WINDOW = { aspectW: 1, aspectH: 1 }; // square frames
const CARD_HEIGHT = "clamp(320px, 51vh, 540px)"; // taller cards; width derives from aspect
const CARD_GAP = "clamp(0.85rem, 1.4vw, 1.4rem)"; // matches HeroCarousel's gap (HERO_GAP) for consistency; uniform trailing margin makes the doubled row loop exactly

const WINDOWS: { src: string; alt: string }[] = [
  { src: "/images-web/Transparent/Plain.png", alt: "The Plain bowl" },
  { src: "/images-web/Transparent/Tropic.png", alt: "" },
  { src: "/images-web/Transparent/Moment.png", alt: "" },
  { src: "/images-web/Transparent/Silk.png", alt: "" },
  { src: "/images-web/Transparent/Bloom.png", alt: "" },
  { src: "/images-web/Transparent/Crunch.png", alt: "" },
];

// Doubled so one full set can scroll off-screen while the identical second set
// fills the viewport: seamless loop at translateX(-setWidth) (same technique as
// HeroCarousel / the gallery-marquee CSS). 6 large square cards (up to 540px each)
// exceed the viewport width, so a single doubling is enough to never show the end.
const REPEATED_WINDOWS = [...WINDOWS, ...WINDOWS];

const STATIC_BOWL = {
  src: "/images-web/Transparent/Moment.png",
  alt: "The Moment bowl",
};

export function BuildSection() {
  // ── Carousel (desktop/tablet) refs ────────────────────────────────────────
  const sectionRef = useRef<HTMLElement>(null);
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

  // Each layout reveals only once its bowls have decoded. The refs belong to
  // different branches, so each gate is armed only while its branch is mounted.
  const rowShow = useRevealReady(sectionRef, "0px", useScrollAnimation);
  const staticShow = useRevealReady(staticSectionRef, "0px", layoutMode === "static");

  // ── Desktop / tablet: continuous carousel + per-window parallax ───────────
  useGSAP(
    () => {
      if (!useScrollAnimation || !rowRef.current) return;

      const row = rowRef.current;
      const windows = windowRefs.current.filter(Boolean) as HTMLDivElement[];
      const bowls = bowlRefs.current.filter(Boolean) as HTMLDivElement[];

      // Center each bowl on its own axis; parallax x is composed on top of this.
      gsap.set(bowls, { xPercent: -50 });

      const setRowX = gsap.quickSetter(row, "x", "px") as (v: number) => void;
      const setBowlX = bowls.map(
        (b) => gsap.quickSetter(b, "x", "px") as (v: number) => void
      );

      let vw = window.innerWidth;
      let setWidth = 0; // width of one full set of cards (row is doubled → scrollWidth / 2)
      // Row starts shifted left by one set so the second (identical) copy fills
      // the viewport; it glides rightward and wraps by exactly one set width.
      let rowX = 0;

      const measure = () => {
        vw = window.innerWidth;
        setWidth = row.scrollWidth / 2;
        // Keep rowX within one set after a resize so the wrap stays seamless.
        if (setWidth > 0) rowX = -setWidth + (((rowX % setWidth) + setWidth) % setWidth);
      };

      const applyParallax = () => {
        // Per-window parallax: the bowl lags its frame based on where that frame
        // currently sits relative to viewport center (locomotive-style). Measuring
        // the parent window's post-transform rect is safe: the bowl's own x never
        // feeds back into it. Identical to the previous scroll-driven version.
        for (let i = 0; i < windows.length; i++) {
          const rect = windows[i].getBoundingClientRect();
          const offset = rect.left + rect.width / 2 - vw / 2;
          setBowlX[i](-offset * PARALLAX_STRENGTH);
        }
      };

      measure();
      rowX = -setWidth;
      setRowX(rowX);
      applyParallax();

      // Single continuous loop: advance the row rightward, wrap at the set
      // boundary, then re-apply parallax against the freshly-moved windows.
      const tick = (_time: number, deltaMs: number) => {
        if (setWidth <= 0) return;
        rowX += CAROUSEL_SPEED_PX_PER_SEC * (deltaMs / 1000);
        if (rowX >= 0) rowX -= setWidth; // seamless wrap (content is doubled)
        setRowX(rowX);
        applyParallax();
      };
      gsap.ticker.add(tick);

      const onResize = () => measure();
      window.addEventListener("resize", onResize);

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
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });

      // This section swaps from the short static layout into the taller
      // carousel one on mount, after sections below have already measured
      // their ScrollTriggers against the shorter layout. Refresh so they
      // re-measure.
      requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => {
        gsap.ticker.remove(tick);
        window.removeEventListener("resize", onResize);
      };
    },
    { scope: sectionRef, dependencies: [useScrollAnimation] }
  );

  // ── Mobile: one-time stagger reveal on scroll into view ───────────────────
  useGSAP(
    () => {
      if (!useMobileReveal || !staticShow || !staticSectionRef.current) return;

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
    { scope: staticSectionRef, dependencies: [useMobileReveal, staticShow] }
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
              sizes="min(72vw, 18rem)"
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
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
    <section
      ref={sectionRef}
      id="st-section"
      className="relative w-full bg-cream overflow-x-clip pt-20 pb-8"
      aria-label="Build A Bowl"
    >
      {/* Normal document flow: section height derives from its content
          (title stack + gap + card height + paddings), so spacing edits move
          the whole section as one block. overflow-x-clip contains the
          wider-than-viewport marquee row without hiding vertical overflow. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Title stack: static block above the carousel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
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
            CREATE YOUR PERFECT BOWL
          </h2>
          <div
            ref={ctaRef}
            style={{ marginTop: "1.75rem", willChange: "transform, opacity" }}
          >
            <CTAButton href="/build" variant="dark">
              Build Your Custom Bowl
            </CTAButton>
          </div>
        </div>

        {/* Continuously looping row of soft-blue clipping windows. Fixed
            margin-top guarantees breathing room below the button regardless
            of headline/viewport size; the cards' own height then sets the
            rest of the section's height. */}
        <div
          aria-hidden
          style={{
            width: "100%",
            marginTop: "clamp(2.5rem, 6vh, 4.5rem)",
            opacity: rowShow ? 1 : 0,
            transition: "opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
          ref={rowRef}
          style={{
            display: "flex",
            width: "max-content",
            willChange: "transform",
          }}
        >
          {REPEATED_WINDOWS.map((w, i) => (
            <div
              key={i}
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
                // Uniform trailing margin on EVERY card (incl. the last) so the
                // doubled row is exactly 2× one set → scrollWidth / 2 loops seamlessly.
                marginRight: CARD_GAP,
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
                  sizes={`calc(${BOWL_OVERFLOW} * ${CARD_HEIGHT})`}
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
    </section>
  );
}
