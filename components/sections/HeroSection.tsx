"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { usePageReady } from "@/components/transition/TransitionProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { HeroCarousel } from "@/components/ui/HeroCarousel";
import { CTAButton } from "@/components/ui/CTAButton";
import { CRITICAL_IMAGE } from "@/lib/criticalImages";
import {
  HERO_RIGHT_IMAGE_SRC,
  HERO_LOGO_DARK_SRC,
  HERO_LOGO_LIGHT_SRC,
} from "@/lib/heroAssets";

// ── Entrance timing ──────────────────────────────────────────────────────
// Three-beat sequence: (1) the left column, the title, fades in, (2) right
// image fades in, (3) a cream cover panel sitting over the carousel slides
// off to the right, revealing it left-to-right. On mobile the portrait is the
// full-bleed background, so it leads and the title follows.
// Every knob for the whole sequence lives here; tweak freely, with one
// constraint: Chrome records Largest Contentful Paint when a fading element
// reaches full opacity, so the LCP element's delay + duration (the portrait on
// desktop, the lockup on mobile) is paid in full against the 2.5s threshold.
// Durations sit at the top of the house 1.0 to 1.4s range for that reason.
const TIMING = {
  ease: [0.16, 1, 0.3, 1] as number[],
  leftColumn: { delay: 0.2, duration: 1.4 }, // step 1: title
  ctas: { delay: 0.9, duration: 1.2 }, // step 1b: actions under the title
  image: { delay: 0.35, duration: 1.4 }, // step 2: right image (desktop)
  imageMobile: { delay: 0, duration: 1.2 }, // mobile background: leads, title follows
  carousel: { delay: 1.0, duration: 1.6 }, // step 3: carousel cover slide-off
} as const;

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// Cover panel slide-off: same "hidden"/"visible" variant idiom as every
// other hero element, driven by the same `animate` string, so it honors
// TIMING.carousel.delay/duration exactly like everything else does.
const slideOff: Variants = {
  hidden: { x: "0%" },
  visible: { x: "100%" },
};

// One shared gutter used everywhere: between carousel tiles, between the right
// image and the carousel, and between the carousel and the hero's bottom edge.
const HERO_GAP = "clamp(0.85rem, 1.4vw, 1.4rem)";
// Height-derived like the hero itself (.hero is 100svh), so a short window
// shrinks the carousel and the portrait band together rather than only the band.
const CAROUSEL_TILE = "clamp(150px, 20vh, 260px)";

// Logo lockup: dark ink on the cream desktop canvas, light on the mobile scrim.
const LOGO_ALT = "MERŌS House of Yogurt";
const LOGO_W = 2038;
const LOGO_H = 820;
const LOGO_SIZES = "(max-width: 1023px) 72vw, 28vw";

// One DOM for both layouts; the .hero-* rules in globals.css decide what shows
// below 1024px. Rendering the layouts conditionally on a JS media query meant
// the server HTML (and its image preload) was always the desktop one, so a
// phone fetched the desktop hero variant, hydrated, then fetched the mobile
// one and shifted layout. With a single portrait <Image> whose `sizes` covers
// both layouts, the browser picks the one right variant from the HTML.
export function HeroSection() {
  // Gated on both the first-load preloader and any in-flight page transition,
  // so the entrance cascade also replays when navigating back to "/".
  const ready = usePageReady();
  // Timing only, never layout. False until the first client effect, but the
  // entrance cannot start before the preloader's 500ms floor, by which point
  // it is correct.
  const isMobile = useIsMobile(1023);
  const animate = ready ? "visible" : "hidden";
  const imageTiming = isMobile ? TIMING.imageMobile : TIMING.image;
  // One-shot cover panel over the carousel: slides off once, then is
  // removed from the DOM for good (nothing left animating or painting).
  const [carouselCoverGone, setCarouselCoverGone] = useState(false);

  return (
    <section aria-label="MERŌS House of Yogurt" className="hero">
      {/* Content region: portrait (right half / full bleed), logo and CTAs */}
      <div className="hero-body">
        <motion.div
          aria-hidden
          className="hero-portrait"
          initial="hidden"
          animate={animate}
          variants={fadeIn}
          transition={{ duration: imageTiming.duration, delay: imageTiming.delay, ease: TIMING.ease }}
        >
          <Image
            src={HERO_RIGHT_IMAGE_SRC}
            alt="MERŌS smoothie, freshly made"
            fill
            priority
            className="object-cover"
            style={{ objectPosition: "center center" }}
            sizes="(max-width: 1023px) 100vw, 50vw"
            {...CRITICAL_IMAGE}
          />
          <div className="hero-scrim" />
        </motion.div>

        <div className="hero-lead">
          {/* Both lockups are in the DOM; CSS shows the one for the layout.
              They are a few kilobytes each, so preloading both is cheaper
              than a layout that can only be decided after hydration. */}
          <motion.div
            className="hero-logo"
            initial="hidden"
            animate={animate}
            variants={fadeIn}
            transition={{ duration: TIMING.leftColumn.duration, delay: TIMING.leftColumn.delay, ease: TIMING.ease }}
          >
            <Image
              src={HERO_LOGO_DARK_SRC}
              alt={LOGO_ALT}
              width={LOGO_W}
              height={LOGO_H}
              priority
              sizes={LOGO_SIZES}
              className="hero-logo-dark"
              style={{ width: "100%", height: "auto" }}
              {...CRITICAL_IMAGE}
            />
            <Image
              src={HERO_LOGO_LIGHT_SRC}
              alt={LOGO_ALT}
              width={LOGO_W}
              height={LOGO_H}
              priority
              sizes={LOGO_SIZES}
              className="hero-logo-light"
              style={{ width: "100%", height: "auto" }}
              {...CRITICAL_IMAGE}
            />
          </motion.div>

          <motion.div
            className="hero-ctas"
            initial="hidden"
            animate={animate}
            variants={fadeIn}
            transition={{ duration: TIMING.ctas.duration, delay: TIMING.ctas.delay, ease: TIMING.ease }}
          >
            <div className="hero-ctas-dark">
              <CTAButton variant="dark" href="#footer">Visit MERŌS</CTAButton>
              <CTAButton variant="dark" href="/order">Order Now</CTAButton>
            </div>
            <div className="hero-ctas-light">
              <CTAButton variant="light" href="#footer">Visit MERŌS</CTAButton>
              <CTAButton variant="light" href="/order">Order Now</CTAButton>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Full-width continuous carousel across the bottom (desktop only) */}
      <div className="hero-carousel" style={{ paddingTop: HERO_GAP, paddingBottom: HERO_GAP }}>
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
