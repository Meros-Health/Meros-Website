"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { CTAButton } from "@/components/ui/CTAButton";
import { useRevealReady } from "@/lib/useRevealReady";
import { CLIP_REVEAL_TIMING } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

const BOWL_SIZE = 1080;

// The gap above COMPOSE YOUR OWN, and half of an argument that starts in the
// section before this one. SignatureMenuSection ends on an "or" that has to
// read as sitting between the two headings, so the space under it cannot be a
// leftover: it is this. Deliberately shorter than a full section token, which
// leaves the hinge a little above the geometric middle of the seam and a little
// nearer this heading, where it belongs. The heading is large and the button
// above the hinge is small, so an exactly even split reads as high.
const SEAM_TOP = "clamp(2.25rem, 4.6vw, 4.6rem)";

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
const CARD_HEIGHT = "clamp(320px, 32vw, 540px)"; // taller cards; width derives from aspect
const CARD_GAP = "clamp(0.85rem, 1.4vw, 1.4rem)"; // matches HeroCarousel's gap (HERO_GAP) for consistency; uniform trailing margin makes the doubled row loop exactly

const WINDOWS: { src: string; alt: string }[] = [
  { src: "/images-web/Transparent/Plain.png", alt: "The Plain bowl" },
  { src: "/images-web/Transparent/Tropic.png", alt: "" },
  { src: "/images-web/Transparent/Moment.png", alt: "" },
  { src: "/images-web/Transparent/Silk.png", alt: "" },
  { src: "/images-web/Transparent/Crunch.png", alt: "" },
];

// Repeated so one full set can scroll off-screen while the identical sets
// behind it fill the viewport: seamless loop at translateX(-setWidth) (same
// technique as HeroCarousel / the gallery-marquee CSS). The tail is never
// exposed as long as (SET_REPEAT - 1) sets are at least as wide as the
// viewport. One set of 5 cards is about 2810px at the 540px cap, which a
// 3440px ultrawide exceeded with two sets (the loop seam showed every cycle),
// so three sets cover up to 5620px. (The Bloom left the strip with the
// 2026-08-28 menu change; its successor, The Seasonal, has no photography.)
export const SET_REPEAT = 3;
const REPEATED_WINDOWS = Array.from({ length: SET_REPEAT }, () => WINDOWS).flat();

// The one bowl the mobile and reduced-motion layouts show, standing in for the
// carousel the desktop branch runs. The Tropics, not The Moment: the same shot
// the footer tiles leave out because it reads as the retired Bloom. Nothing on
// this screen is a menu listing, so a photograph that reads as a bowl of fruit
// is doing the right job here, and it is still a bowl that can be ordered.
const STATIC_BOWL = {
  src: "/images-web/Transparent/Tropic.png",
  alt: "The Tropics bowl",
};

export function BuildSection() {
  // ── Carousel (desktop/tablet) refs ────────────────────────────────────────
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const windowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bowlRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Static (mobile / reduced-motion) refs ─────────────────────────────────
  const staticSectionRef = useRef<HTMLElement>(null);
  const staticTitleRef = useRef<HTMLHeadingElement>(null);
  const staticSubtitleRef = useRef<HTMLParagraphElement>(null);
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
      let setWidth = 0; // width of one full set of cards (row holds SET_REPEAT sets)
      // Row starts shifted left by one set so the second (identical) copy fills
      // the viewport; it glides rightward and wraps by exactly one set width.
      let rowX = 0;

      const measure = () => {
        vw = window.innerWidth;
        setWidth = row.scrollWidth / SET_REPEAT;
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
        if (rowX >= 0) rowX -= setWidth; // seamless wrap (content repeats)
        setRowX(rowX);
        applyParallax();
      };
      gsap.ticker.add(tick);

      const onResize = () => measure();
      window.addEventListener("resize", onResize);

      // Title stack: slow, staggered reveal-in as the section approaches
      // (brand motion: ~1.1s, ease-out, descending hierarchy). The headline is
      // the first thing in, because nothing sits above it any more.
      const titleTargets = [headlineRef.current, subtitleRef.current, ctaRef.current];
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
        staticTitleRef.current,
        staticSubtitleRef.current,
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
        className="relative flex w-full flex-col justify-start overflow-hidden bg-cream px-section-x-fluid pb-section"
        // No 100svh floor and no vertical centring. Both were here to make this
        // a full-screen panel, and together they put a viewport's worth of
        // leftover space above the heading, which is the space the previous
        // section's "or" is supposed to be sitting in the middle of. The
        // section is now as tall as what it holds, so that gap is SEAM_TOP and
        // nothing else.
        style={{ paddingTop: SEAM_TOP }}
        aria-label="Build A Bowl"
      >
        <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
          <h2
            ref={staticTitleRef}
            className="font-headline text-midnight leading-[1.05] uppercase"
            style={{ fontSize: "clamp(2rem, 9vw, 3.25rem)", ...revealHiddenStyle }}
          >
            Compose Your Own.
          </h2>

          <p
            ref={staticSubtitleRef}
            className="font-body-mixed mt-4 leading-relaxed text-juniper"
            style={{ fontSize: "clamp(0.875rem, 3.6vw, 1rem)", ...revealHiddenStyle }}
          >
            Pick your base and toppings. Protein and calories update as you build.
          </p>

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
              Build
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
      className="relative flex w-full flex-col justify-start overflow-x-clip bg-cream pb-section"
      style={{ minHeight: "100svh", paddingTop: SEAM_TOP }}
      aria-label="Build A Bowl"
    >
      {/* Normal document flow, top-aligned in a section that is at least a
          viewport tall. Content still sets the floor (title stack + gap + card
          height + paddings), so a window too short to hold it scrolls rather
          than clipping. overflow-x-clip contains the wider-than-viewport
          marquee row without hiding vertical overflow.

          It used to be justify-center. Centring made the space above the
          heading a leftover: whatever the viewport had spare after the content,
          halved. That is unknowable from the section above, and the menu
          section's "or" has to sit on the midpoint of the seam between the two
          headings, so it needs the number to be fixed. Top-aligned with an
          explicit padding, the gap is the same on every screen and the hinge
          can match it. The trade is that on a display tall enough for
          justify-center to have had slack, that slack now falls below the
          carousel instead of being split above and below it. */}
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
            COMPOSE YOUR OWN
          </h2>
          {/* One line at every desktop width. No width cap, and the font size
              scales with the viewport rather than the line wrapping: 1.6vw only
              binds below ~1060px, and the 0.875rem floor still fits 70
              characters inside the narrowest column this branch ever renders
              (640px viewport minus the stack's 1.5rem padding). */}
          <p
            ref={subtitleRef}
            className="font-body-mixed leading-relaxed text-juniper"
            style={{
              marginTop: "1rem",
              whiteSpace: "nowrap",
              fontSize: "clamp(0.875rem, 1.6vw, 1.0625rem)",
              willChange: "transform, opacity",
            }}
          >
            Pick your base and toppings. Protein and calories update as you build.
          </p>
          <div
            ref={ctaRef}
            style={{ marginTop: "1.75rem", willChange: "transform, opacity" }}
          >
            <CTAButton href="/build" variant="dark">
              Build
            </CTAButton>
          </div>
        </div>

        {/* Continuously looping row of grapefruit clipping windows. Fixed
            margin-top guarantees breathing room below the button regardless
            of headline/viewport size; the cards' own height then sets the
            rest of the section's height. */}
        <div
          aria-hidden
          style={{
            width: "100%",
            marginTop: "clamp(2.5rem, 5vw, 4.5rem)",
            opacity: rowShow ? 1 : 0,
            transition: `opacity ${CLIP_REVEAL_TIMING}`,
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
                backgroundColor: "var(--color-grapefruit)",
                // Uniform trailing margin on EVERY card (incl. the last) so the
                // row is exactly SET_REPEAT sets → scrollWidth / SET_REPEAT loops seamlessly.
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
