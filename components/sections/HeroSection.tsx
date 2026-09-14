"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { usePageReady } from "@/components/transition/TransitionProvider";
import { CTAButton } from "@/components/ui/CTAButton";
import { CRITICAL_IMAGE } from "@/lib/criticalImages";
import { HERO_IMAGE_SRC, HERO_LOCKUP_SRC } from "@/lib/heroAssets";
import { HERO_EASE, HERO_ENTRANCE, type EntranceBeat } from "@/lib/heroEntrance";
import { useCurtainParallax } from "@/lib/useParallax";

// One panel, the whole first screen: the photograph edge to edge, with the
// lockup and the two calls to action centred over it, and the tagline at its
// foot.
//
// It was two panels and 150svh until 2026-09-07. The second was half a screen
// below the fold carrying "A day's fuel, defined by you" over a second
// photograph of the same table. The band is gone and the line moved up into
// this panel, under the buttons, which is where it now closes the group rather
// than opening a section of its own.
//
// Two things that buys, stated rather than left to be discovered. The line no
// longer needs a photograph of its own to sit on, so the second frame is out of
// the page entirely; and the whole page moved 50svh earlier, so "Our
// Favourites" is that much sooner under the fold.
//
// One thing it does not change: there is nothing peeking under the fold to say
// the page continues. A full-screen panel 1 already put the fold on the seam
// between the two panels, so nothing peeked before either. If a cue is wanted,
// take a few svh off this panel so the menu heading crests the fold, rather
// than adding a chevron.
//
// The panel is held while the page is pulled over it (.hero-curtain in
// globals.css), and the photograph drifts a little under that: it climbs by
// PARALLAX of the panel's height over the hold, so it sinks away under the
// menu rather than sitting dead still while the sheet comes up. That is the
// only scroll-driven motion here, and it is deliberately faint. The panel
// enters under a clip-path wipe with a staggered lockup, two buttons and a
// line of type on it, and an earlier, faster drift (0.12, until 2026-09-07)
// read as one more thing happening rather than as depth. This one starts only
// once the reader scrolls, by which time the entrance is over, and at a rate
// the eye feels rather than watches.
//
// One thing this layout does not own: the nav bar is a fixed cream band at
// every scroll position (components/ui/Navbar.tsx), so it sits as a solid bar
// across the top of the photograph. The panel reserves its height as padding so
// the centred group clears it, but the band itself is global chrome and is
// left alone.

const LOCKUP_ALT = "MERŌS House of Yogurt";
const LOCKUP_W = 2038;
const LOCKUP_H = 820;
const LOCKUP_SIZES = "(max-width: 1023px) 66vw, 32vw";

const IMAGE_ALT = "Greek yogurt bowls, granola, honey and fresh fruit laid out on a counter";
// The panel is edge to edge at every breakpoint, so it wants a full-width variant.
const IMAGE_SIZES = "100vw";
// Which slice of the frame survives the crop, as the share of the overflow
// taken off the top. 55% rather than dead centre: it carries the crop a little
// way into the lower half of the flat-lay, where the bowls and the poured
// honey sit, without reaching the bottom edge where the cropped-off boards
// read as clutter. On a phone the frame is cropped on its width instead, so
// this value stops mattering there.
//
// Read against the layer, not the panel. The layer overhangs the panel at the
// bottom by PARALLAX of its height, so at rest the panel shows the layer's top
// 100/105, and the crop is pinned a little lower in the frame than the number
// says. At five percent the correction is under three percent of the panel,
// which is not worth folding into the value; it would be if PARALLAX grew.
const IMAGE_FOCUS = "center 55%";

// How far the photograph climbs, as a fraction of the panel's height, by the
// time the menu has covered it. Very little: the hold is most of a screen of
// scrolling, so at 900px tall this is 45px spread over the whole of it. Under
// about three the movement is not there; the old rate of twelve was the one
// that competed with the entrance. The layer overhangs the panel's bottom by
// exactly this, set from the same constant (see .hero-image-layer).
const PARALLAX = 0.05;

// One line, and it must stay one line at every width. It was authored as two
// while it was a band of its own, where it had a half-screen to fill; sitting
// at the foot of the photograph it is a caption, and a caption that stacks
// reads as a paragraph. The type is sized so the whole line clears the site's
// 322px minimum viewport with room to spare rather than being held together by
// nowrap alone (see .hero-tagline in globals.css).
const TAGLINE = "A DAY'S FUEL, DEFINED BY YOU";

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

// The tagline is uncovered from its leading edge rightward, the treatment it
// had as a band and the reason it still reads as a line being written rather
// than a fourth thing fading up. It is a wipe now driven by the entrance
// timeline rather than by scrolling into view, which is what let the wrapper
// element go: the old split existed only because an element clipped to zero
// width cannot be measured to decide whether to unclip it, and a beat on a
// delay measures nothing.
const CLIP_RIGHT: Variants = {
  hidden: { clipPath: "inset(0 100% 0 0)" },
  visible: { clipPath: "inset(0 0 0 0)" },
};

export function HeroSection() {
  // Gated on both the first-load preloader and any in-flight page transition,
  // so the entrance cascade also replays when navigating back to "/".
  const ready = usePageReady();
  const reduced = useReducedMotion();
  const animate = ready ? "visible" : "hidden";
  // The section is the held panel and its parent (#hero in app/page.tsx) is
  // the track the hook measures the hold from.
  const { panelRef, layerRef } = useCurtainParallax<HTMLElement, HTMLDivElement>(PARALLAX);

  // Reduced motion keeps the staged reveal but takes out the movement and the
  // waiting: every beat is an instant cut, in the same order.
  const rise = reduced ? FADE : FADE_RISE;
  const clip = reduced ? FADE : CLIP_DOWN;
  const wipe = reduced ? FADE : CLIP_RIGHT;
  const beat = (b: EntranceBeat) =>
    reduced ? { duration: 0, delay: 0 } : { ...b, ease: HERO_EASE };

  return (
    <section ref={panelRef} aria-label="MERŌS House of Yogurt" className="hero">
      {/* The whole first screen. The photograph is the ground, the scrim sits
          on it, and the lockup, the actions and the tagline sit on that. All
          of it is inside the clip, so the wipe uncovers a finished panel
          rather than a photograph that later has type dropped onto it. */}
      <div className="hero-panel">
        <motion.div
          className="hero-image-clip"
          initial="hidden"
          animate={animate}
          variants={clip}
          transition={beat(HERO_ENTRANCE.image)}
          style={{ willChange: "clip-path" }}
        >
          {/* The photograph alone rides the drift layer. The scrim and the type
              stay flush to the panel: the darkening must not move, and the
              type least of all. */}
          <div
            ref={layerRef}
            className="hero-image-layer"
            style={{ "--hero-parallax": `${PARALLAX * 100}%` } as React.CSSProperties}
          >
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
          {/* Inside the clip so it is revealed with the frame, and a sibling of
              the photograph rather than a child of it, so it darkens the whole
              panel. The panel carries type, which is the whole reason it has a
              scrim at all: the old image band carried none and kept its frame
              undarkened. */}
          <div className="hero-scrim" aria-hidden />

          {/* The lockup with the actions under it, as one centred column in
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

            {/* Filled cream rather than the site's outlined dark button: a
                midnight outline over a photograph has nothing to sit on, and
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

          {/* Last beat, the quietest thing on the screen, and the only one not
              in the centred column: it is anchored to the foot of the panel.
              A sibling of .hero-content rather than a child, so that column
              stays the lockup and the actions and nothing else. */}
          <motion.p
            className="hero-tagline"
            initial="hidden"
            animate={animate}
            variants={wipe}
            transition={beat(HERO_ENTRANCE.tagline)}
          >
            {TAGLINE}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
