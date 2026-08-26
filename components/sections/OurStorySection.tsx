"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";

// Four lines, revealed in order. Descriptors stay one line each so the whole
// section fits a single viewport beside the smoothie.
const STORY_LINES = [
  {
    headline: "LOCALLY SOURCED.",
    body: "Sourced as locally as possible, with trusted local vendors for the rest.",
  },
  {
    headline: "STRAINED IN-HOUSE.",
    body: "Yogurt strained daily for higher protein and a thicker texture.",
  },
  {
    headline: "SERVED FRESH.",
    body: "Bowls and smoothies made when you order them.",
  },
  {
    headline: "DAILY FUEL.",
    body: "A meal's worth of protein and calories in one bowl.",
  },
];

// Each reveal fires when *its own* element scrolls into view (IntersectionObserver),
// so it's immune to the on-mount layout shift from BuildSection's pin above it.
const ENTER_VIEWPORT = { once: true, margin: "-100px" } as const;
// Headline fires later than the rest so the line-by-line reveal lands
// mid-screen instead of starting near the bottom edge.
const HEADLINE_VIEWPORT = { once: true, margin: "-30%" } as const;
const REVEAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Our Story smoothie slide-in (tweak these) ──────────────────────────────
const STORY_IMAGE = "/images-web/Transparent/Crave.png"; // which smoothie
const STORY_IMAGE_SLIDE_FROM = 140;   // px: starting offset to the RIGHT (moves left into place)
const STORY_IMAGE_DELAY = 0.15;       // s before the slide begins
const STORY_IMAGE_DURATION = 3;     // s the slide takes (uses REVEAL_EASE quint-out)
// Viewport-relative trigger: fires when the image is this far into the viewport.
// Percentage margin scales with screen size, so timing holds on all viewports.
const STORY_IMAGE_VIEWPORT = { once: true, margin: "-20%" } as const;

// Stagger parent — children reveal in sequence, top line first.
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.06 } },
};

const lineReveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 1.0, ease: REVEAL_EASE } },
};

export function OurStorySection() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <section
      className="relative w-full overflow-hidden bg-cream text-midnight min-h-[70svh] md:min-h-[100svh]"
    >
      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex flex-col min-h-[70svh] md:min-h-[100svh] px-section-x py-16 md:py-24">

        {/* Eyebrow */}
        <div className="mb-auto">
          <motion.span
            className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]"
            initial={prefersReducedMotion ? false : { opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={ENTER_VIEWPORT}
            transition={{ duration: 1.0, ease: REVEAL_EASE }}
          >
            Our Story
          </motion.span>
        </div>

        {/* Middle: four lines (left) + smoothie slide-in (right) */}
        <div className="mt-auto mb-auto grid grid-cols-1 md:grid-cols-2 items-center gap-10 md:gap-8">
          {/* Left — headline + descriptor per line, revealed top to bottom */}
          <motion.div
            className="flex flex-col gap-5 md:gap-7"
            variants={container}
            initial={prefersReducedMotion ? false : "hidden"}
            whileInView="show"
            viewport={HEADLINE_VIEWPORT}
          >
            {STORY_LINES.map((line) => (
              <motion.div key={line.headline} variants={lineReveal}>
                <h2 className="font-headline text-midnight leading-[1.0] text-[clamp(1.6rem,7vw,2.25rem)] md:text-[clamp(1.75rem,3.4vw,3.5rem)]">
                  {line.headline}
                </h2>
                <p className="font-body-mixed text-midnight/55 text-sm leading-relaxed mt-2 max-w-md">
                  {line.body}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Right — smoothie slides in from the right, then stays */}
          <div className="flex justify-center md:justify-end">
            <motion.div
              className="w-[68%] sm:w-[55%] md:w-[88%] max-w-[520px]"
              initial={prefersReducedMotion ? false : { opacity: 0, x: STORY_IMAGE_SLIDE_FROM }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={STORY_IMAGE_VIEWPORT}
              transition={{ delay: STORY_IMAGE_DELAY, duration: STORY_IMAGE_DURATION, ease: REVEAL_EASE }}
            >
              <Image
                src={STORY_IMAGE}
                alt="MERŌS smoothie"
                width={1080}
                height={1080}
                sizes="(min-width: 768px) 40vw, 70vw"
                style={{ width: "100%", height: "auto" }}
              />
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
}
