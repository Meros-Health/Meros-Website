"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import gsap from "gsap";
import { usePageReady } from "@/components/transition/TransitionProvider";
import { CTAButton } from "@/components/ui/CTAButton";
import { CRITICAL_IMAGE } from "@/lib/criticalImages";
import { HERO_IMAGE_SRC, HERO_LOCKUP_SRC, HERO_TAGLINE_IMAGE_SRC } from "@/lib/heroAssets";
import { HERO_EASE, HERO_ENTRANCE, type EntranceBeat } from "@/lib/heroEntrance";
import { useParallax } from "@/lib/useParallax";
import { CLIP_REVEAL_TIMING } from "@/lib/motion";

// Two panels, 150svh in total:
//
//   1. the full screen: the photograph edge to edge, with the lockup and the
//      two calls to action centred over it
//   ── the fold ──
//   2. half a screen: the tagline, centred over a second photograph
//
// The second panel is the reason the hero is taller than the screen, and it
// is doing less work here than it used to. When panel 1 was half a screen the
// fold cut panel 2 in two, which is the oldest way to say "keep going". A
// full-screen first panel spends that: the fold now lands on the seam, and
// nothing peeks. That is the price of the treatment, not an oversight. If it
// needs buying back, take a few svh off panel 1 rather than adding a chevron.
//
// One thing this layout does not own: the nav bar is a fixed cream band at
// every scroll position (components/ui/Navbar.tsx), so it sits as a solid bar
// across the top of the photograph. Panel 1 reserves its height as padding so
// the centred group clears it, but the band itself is global chrome and is
// left alone.

const LOCKUP_ALT = "MERŌS House of Yogurt";
const LOCKUP_W = 2038;
const LOCKUP_H = 820;
const LOCKUP_SIZES = "(max-width: 1023px) 66vw, 32vw";

const IMAGE_ALT = "Greek yogurt bowls, granola, honey and fresh fruit laid out on a counter";
// Both panels are edge to edge at every breakpoint, so both want a full-width variant.
const IMAGE_SIZES = "100vw";
// Which slice of the frame survives the crop, as the share of the overflow
// taken off the top. 55% rather than dead centre: it carries the crop a little
// way into the lower half of the flat-lay, where the bowls and the poured
// honey sit, without reaching the bottom edge where the cropped-off boards
// read as clutter. On a phone the frame is cropped on its width instead, so
// this value stops mattering there. See the note on PARALLAX for how the two
// interact.
const IMAGE_FOCUS = "center 55%";
const TAGLINE_IMAGE_FOCUS = "center 50%";

// How far each image climbs, as a fraction of its panel's height, in each
// direction. Deliberately different between the two: equal rates read as one
// background sliding behind two windows, which is the opposite of what depth
// is for.
//
// The CSS has to agree with these numbers, because the layer must overhang its
// panel by exactly this much; --hero-parallax is set from them below rather
// than written twice.
//
// A note for whoever next tunes a crop against these. The layer overhangs its
// panel by its full travel at both ends, and at rest it has not spent that
// travel, so whichever edge of the frame a crop is pinned to is held off
// screen by a fraction of the rate. Pinning to the top costs about 0.67x the
// rate; pinning to the bottom costs about 1.33x, because the resting offset
// works against it rather than with it. IMAGE_FOCUS sits below centre, the
// dearer end, so leave it some headroom above the frame's bottom edge.
const PARALLAX = { image: 0.12, tagline: 0.19 } as const;

// Two lines, authored as two. Left to wrapping, the count changes with the
// viewport, the font size and the letter-spacing all at once; broken here it
// is two lines on a 320px phone and on a 5K display alike, which is the only
// way a promise like "always two lines" survives contact with a real device.
const TAGLINE_LINES = ["A DAY'S FUEL,", "DEFINED BY YOU"] as const;
const TAGLINE_IMAGE_ALT = "Three Meros yogurt bowls on a sunlit counter";

const FADE: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// Short travel under a long duration: the combination that reads as settling
// rather than sliding. Long travel over the same duration reads sluggish.
const FADE_RISE: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

// The photograph is uncovered from its top edge downward: the clip's bottom
// inset retracts from 100% to 0. Clipping rather than fading is also the
// cheaper option against Largest Contentful Paint, which refuses to count an
// element at opacity 0 but does not track a clip path.
const CLIP_DOWN: Variants = {
  hidden: { clipPath: "inset(0% 0% 100% 0%)" },
  visible: { clipPath: "inset(0% 0% 0% 0%)" },
};

/**
 * True once `fraction` of the element has been on screen, and true forever
 * after.
 *
 * Measured off gsap.ticker rather than with an IntersectionObserver. Two
 * reasons, and the first is the one that bit:
 *
 * An observer measures the element it is given, and the element being revealed
 * here carries a clip path that paints it to zero width until the reveal runs.
 * Observing it is circular: it cannot become visible until it is revealed, and
 * it is not revealed until it becomes visible. SectionBand avoids this by
 * observing an unclipped wrapper and clipping the child, which is also done
 * below; measuring the rect directly removes the trap rather than stepping
 * around it, since a layout rect is not affected by clipping at all.
 *
 * Second, this is the mechanism the parallax on this same panel already runs
 * on: Lenis is stepped by this ticker, so a callback here reads a rect that is
 * current for the frame being drawn.
 */
function useSeen<T extends HTMLElement>(fraction = 0.3) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Once seen, stay seen: no ticker callback, nothing to undo.
    if (!el || seen) return;

    const tick = () => {
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const visible = Math.min(rect.bottom, viewport) - Math.max(rect.top, 0);
      // Against the element's own height, capped at the viewport, so an
      // element taller than the screen can still satisfy the fraction.
      const target = Math.min(rect.height, viewport) * fraction;
      if (visible >= target && visible > 0) setSeen(true);
    };

    tick();
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [seen, fraction]);

  return { ref, seen };
}

export function HeroSection() {
  // Gated on both the first-load preloader and any in-flight page transition,
  // so the entrance cascade also replays when navigating back to "/".
  const ready = usePageReady();
  const reduced = useReducedMotion();
  const animate = ready ? "visible" : "hidden";

  // Panel 2 is below the fold, so it is not part of the load sequence at all:
  // it plays when it is scrolled to, like every other section on the page.
  // The measured element is the wrapper around the line, never the clipped
  // line itself; see useSeen.
  const tagline = useSeen<HTMLDivElement>();

  const imageParallax = useParallax<HTMLDivElement, HTMLDivElement>(PARALLAX.image);
  const taglineParallax = useParallax<HTMLDivElement, HTMLDivElement>(PARALLAX.tagline);

  // Reduced motion keeps the staged reveal but takes out the movement and the
  // waiting: every beat is an instant cut, in the same order.
  const rise = reduced ? FADE : FADE_RISE;
  const clip = reduced ? FADE : CLIP_DOWN;
  const beat = (b: EntranceBeat) =>
    reduced ? { duration: 0, delay: 0 } : { ...b, ease: HERO_EASE };

  return (
    <section aria-label="MERŌS House of Yogurt" className="hero">
      {/* Panel 1: the whole first screen. The photograph is the ground, the
          scrim sits on it, and the lockup and the actions sit on that. All
          three are inside the clip, so the wipe uncovers a finished panel
          rather than a photograph that later has type dropped onto it. */}
      <div
        className="hero-panel hero-panel-full"
        ref={imageParallax.panelRef}
        style={{ "--hero-parallax": `${PARALLAX.image * 100}%` } as React.CSSProperties}
      >
        <motion.div
          className="hero-image-clip"
          initial="hidden"
          animate={animate}
          variants={clip}
          transition={beat(HERO_ENTRANCE.image)}
          style={{ willChange: "clip-path" }}
        >
          <div className="hero-image-layer" ref={imageParallax.layerRef}>
            <Image
              src={HERO_IMAGE_SRC}
              alt={IMAGE_ALT}
              fill
              priority
              className="object-cover"
              style={{ objectPosition: IMAGE_FOCUS }}
              sizes={IMAGE_SIZES}
              {...CRITICAL_IMAGE}
            />
          </div>
          {/* Inside the clip so it is revealed with the frame, outside the
              moving layer so it darkens the panel and not the picture: inside,
              it would slide with the image and leave an undarkened band at
              whichever edge it had travelled away from. The panel now carries
              type, which is the whole reason it has a scrim at all: the old
              image band carried none and kept its frame undarkened. */}
          <div className="hero-scrim" aria-hidden />

          {/* The lockup with the actions under it, as one centred column, in
              normal flow. The gap is the knob that spreads them; nothing here
              is positioned individually or measured in the JS. */}
          <div className="hero-content">
            <motion.div
              className="hero-lockup"
              initial="hidden"
              animate={animate}
              variants={rise}
              transition={beat(HERO_ENTRANCE.logo)}
            >
              <Image
                src={HERO_LOCKUP_SRC}
                alt={LOCKUP_ALT}
                width={LOCKUP_W}
                height={LOCKUP_H}
                priority
                sizes={LOCKUP_SIZES}
                className="hero-lockup-mark"
                {...CRITICAL_IMAGE}
              />
            </motion.div>

            {/* Last beat, and the smallest thing on the screen: the motion
                order follows the visual hierarchy, not the reading order.
                Filled cream here rather than the site's outlined dark button:
                a midnight outline over a photograph has nothing to sit on, and
                there is no cream-outline variant to reach for. */}
            <motion.div
              className="hero-actions"
              initial="hidden"
              animate={animate}
              variants={rise}
              transition={beat(HERO_ENTRANCE.ctas)}
            >
              <CTAButton variant="light" href="#footer">Visit MERŌS</CTAButton>
              <CTAButton variant="light" href="/menu">Order Now</CTAButton>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Panel 2: below the fold. Lazy, and deliberately not a critical image:
          marking it would hold the preloader on a 2880px frame nobody has
          scrolled to. */}
      <div
        className="hero-panel hero-panel-tagline"
        ref={taglineParallax.panelRef}
        style={{ "--hero-parallax": `${PARALLAX.tagline * 100}%` } as React.CSSProperties}
      >
        <div className="hero-image-layer" ref={taglineParallax.layerRef}>
          <Image
            src={HERO_TAGLINE_IMAGE_SRC}
            alt={TAGLINE_IMAGE_ALT}
            fill
            loading="lazy"
            className="object-cover"
            style={{ objectPosition: TAGLINE_IMAGE_FOCUS }}
            sizes={IMAGE_SIZES}
          />
        </div>
        {/* The frame is a bright sandstone counter, so neither cream nor
            midnight type clears AA against every part of it. The scrim settles
            it for every crop at every width, at the cost of a little of the
            photograph. Outside the moving layer, for the reason given on the
            scrim in panel 1. */}
        <div className="hero-scrim" aria-hidden />
        {/* The wrapper is what gets measured and what bounds the wipe; the
            line inside it is what moves. Keeping the two on separate elements
            is the whole fix: a clipped element cannot be asked whether it is
            visible enough to unclip. */}
        <div ref={tagline.ref} className="hero-tagline-wrap">
          <p
            className="hero-tagline"
            style={{
              clipPath: tagline.seen || reduced ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
              transition: reduced ? "none" : `clip-path ${CLIP_REVEAL_TIMING}`,
            }}
          >
            {TAGLINE_LINES.map((line) => (
              <span key={line} className="hero-tagline-line">
                {line}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
