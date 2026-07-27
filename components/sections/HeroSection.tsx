"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { usePageReady } from "@/components/transition/TransitionProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { HeroCarousel } from "@/components/ui/HeroCarousel";
import {
  HERO_RIGHT_IMAGE_SRC,
  HERO_LOGO_DARK_SRC,
  HERO_LOGO_LIGHT_SRC,
} from "@/lib/heroAssets";

// ── Entrance timing ──────────────────────────────────────────────────────
// Three-beat sequence: (1) left column — title — fades in, (2) right
// image fades in, (3) a cream cover panel sitting over the carousel slides
// off to the right, revealing it left-to-right.
// Every knob for the whole sequence lives here — tweak freely.
const TIMING = {
  ease: [0.16, 1, 0.3, 1] as number[],
  leftColumn: { delay: 0.5, duration: 3.0 }, // step 1 — title
  tagline: { delay: 1.3, duration: 2.5 }, // step 1b — tagline under the title
  image: { delay: 0.75, duration: 2.25 }, // step 2 — right image
  carousel: { delay: 1.5, duration: 2.0 }, // step 3 — carousel cover slide-off
} as const;

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// Cover panel slide-off — same "hidden"/"visible" variant idiom as every
// other hero element, driven by the same `animate` string, so it honors
// TIMING.carousel.delay/duration exactly like everything else does.
const slideOff: Variants = {
  hidden: { x: "0%" },
  visible: { x: "100%" },
};

// One shared gutter used everywhere: between carousel tiles, between the right
// image and the carousel, and between the carousel and the hero's bottom edge.
// Fixed nav band height (measured) — used to center the title in the visible
// band between the nav's bottom and the carousel's top rather than the section.
const NAV_HEIGHT_PX = 72;
const HERO_GAP = "clamp(0.85rem, 1.4vw, 1.4rem)";
const CAROUSEL_TILE = "clamp(150px, 20vh, 260px)";

export function HeroSection() {
  // Gated on both the first-load preloader and any in-flight page transition,
  // so the entrance cascade also replays when navigating back to "/".
  const ready = usePageReady();
  const isMobile = useIsMobile(1023); // < 1024px → simplified layout
  const animate = ready ? "visible" : "hidden";
  // One-shot cover panel over the carousel — slides off once, then is
  // removed from the DOM for good (nothing left animating or painting).
  const [carouselCoverGone, setCarouselCoverGone] = useState(false);

  // ── Mobile: full-bleed portrait + scrim, centered title ──
  if (isMobile) {
    return (
      <section
        aria-label="Meros — House of Yogurt"
        style={{ position: "relative", width: "100%", height: "100svh", overflow: "hidden" }}
      >
        <motion.div
          aria-hidden
          initial="hidden"
          animate={animate}
          variants={fadeIn}
          transition={{ duration: 1.4, delay: 0, ease: TIMING.ease }}
          style={{ position: "absolute", inset: 0 }}
        >
          <Image src={HERO_RIGHT_IMAGE_SRC} alt="" fill priority className="object-cover" sizes="100vw" />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.48)" }} />
        </motion.div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 1.5rem",
            gap: "clamp(1.5rem, 6vh, 3rem)",
          }}
        >
          <motion.div
            initial="hidden"
            animate={animate}
            variants={fadeIn}
            transition={{ duration: TIMING.leftColumn.duration, delay: TIMING.leftColumn.delay, ease: TIMING.ease }}
            style={{ width: "clamp(220px, 72vw, 420px)" }}
          >
            <Image
              src={HERO_LOGO_LIGHT_SRC}
              alt="Meros — House of Yogurt"
              width={2038}
              height={820}
              priority
              style={{ width: "100%", height: "auto" }}
            />
            <motion.p
              initial="hidden"
              animate={animate}
              variants={fadeIn}
              transition={{ duration: TIMING.tagline.duration, delay: TIMING.tagline.delay, ease: TIMING.ease }}
              className="font-body-caps text-cream text-center tracking-[0.28em]"
              style={{
                marginTop: "clamp(1rem, 3vh, 1.75rem)",
                fontSize: "clamp(0.7rem, 2.6vw, 0.875rem)",
              }}
            >
              {"1207 HAMILTON STREET, YALETOWN, VANCOUVER, BC"}
            </motion.p>
          </motion.div>
        </div>
      </section>
    );
  }

  // ── Desktop: editorial split on a cream canvas ─────────────────────────
  return (
    <section
      aria-label="Meros — House of Yogurt"
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        overflow: "hidden",
        background: "var(--color-cream)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Content region — bowl+CTAs (left), title (center), image (right half) */}
      <div style={{ position: "relative", flex: "1 1 0%", minHeight: 0 }}>
        {/* Right half: static portrait */}
        <motion.div
          aria-hidden
          initial="hidden"
          animate={animate}
          variants={fadeIn}
          transition={{ duration: TIMING.image.duration, delay: TIMING.image.delay, ease: TIMING.ease }}
          style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%" }}
        >
          <Image
            src={HERO_RIGHT_IMAGE_SRC}
            alt="Meros smoothie, freshly made"
            fill
            priority
            className="object-cover"
            style={{ objectPosition: "center center" }}
            sizes="50vw"
          />
        </motion.div>

        {/* Left half: MEROS logo centered, CTAs centered at the bottom */}
        <div style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%" }}>
          {/* Logo — centered in the left half, within the nav → carousel band */}
          <motion.div
            initial="hidden"
            animate={animate}
            variants={fadeIn}
            transition={{ duration: TIMING.leftColumn.duration, delay: TIMING.leftColumn.delay, ease: TIMING.ease }}
            style={{
              position: "absolute",
              left: "50%",
              top: `calc(50% + ${NAV_HEIGHT_PX / 2}px)`,
              transform: "translate(-50%, -50%)",
              width: "clamp(200px, 28vw, 440px)",
            }}
          >
            <Image
              src={HERO_LOGO_DARK_SRC}
              alt="Meros — House of Yogurt"
              width={2038}
              height={820}
              priority
              style={{ width: "100%", height: "auto" }}
            />
          </motion.div>

          {/* Tagline — bottom of the left half, bottom-aligned with the right image */}
          <motion.p
            initial="hidden"
            animate={animate}
            variants={fadeIn}
            transition={{ duration: TIMING.tagline.duration, delay: TIMING.tagline.delay, ease: TIMING.ease }}
            className="font-body-caps text-midnight text-center tracking-[0.28em]"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              fontSize: "clamp(0.7rem, 0.95vw, 0.875rem)",
            }}
          >
            {"1207 HAMILTON STREET, YALETOWN, VANCOUVER, BC"}
          </motion.p>
        </div>
      </div>

      {/* Full-width continuous carousel across the bottom */}
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          width: "100%",
          overflow: "hidden",
          paddingTop: HERO_GAP,
          paddingBottom: HERO_GAP,
        }}
      >
        <HeroCarousel gap={HERO_GAP} tileHeight={CAROUSEL_TILE} />

        {/* Illusion reveal: a cream panel the exact size of the carousel sits
            on top of it, then slides off to the right once, uncovering the
            carousel left-to-right. Once done, it's removed from the DOM. */}
        {!carouselCoverGone && (
          <motion.div
            aria-hidden
            initial="hidden"
            animate={animate}
            variants={slideOff}
            transition={{
              type: "tween",
              duration: TIMING.carousel.duration,
              delay: TIMING.carousel.delay,
              ease: TIMING.ease,
            }}
            onAnimationComplete={(definition) => {
              if (definition === "visible") setCarouselCoverGone(true);
            }}
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--color-cream)",
              zIndex: 1,
            }}
          />
        )}
      </div>
    </section>
  );
}
