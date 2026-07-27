"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";

const PILLARS = [
  {
    index: "01",
    label: "Strained In-House",
    body: "Our yogurt is finely strained in-house for a higher protein content and creamy, rich texture that’s perfect for bowls and smoothies.",
  },
  {
    index: "02",
    label: "Locally Sourced",
    body: "All ingredients are sourced from the lower mainland, supporting local businesses and ensuring the freshest produce possible.",
  },
  {
    index: "03",
    label: "Health Food",
    body: "We maximize the nutritional value of our products, making them especially rich in nutrients, probiotics, and antioxidants to support your fitness goals.",
  },
];

const HEADLINE_WORDS = ["SOURCED.", "STRAINED.", "SERVED."];

// Each reveal fires when *its own* element scrolls into view (IntersectionObserver),
// so it's immune to the on-mount layout shift from BuildSection's pin above it.
const ENTER_VIEWPORT = { once: true, margin: "-100px" } as const;
// Headline fires later than the rest so the line-by-line reveal lands
// mid-screen instead of starting near the bottom edge. Pillars/eyebrow/divider
// keep ENTER_VIEWPORT — their timing was already right.
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

// Stagger parent — children reveal in sequence (headline lines, then pillars).
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

        {/* Middle: headline (left) + smoothie slide-in (right) */}
        <div className="mt-auto mb-auto grid grid-cols-1 md:grid-cols-2 items-center gap-10 md:gap-8">
          {/* Left — headline, line by line (reveal unchanged) */}
          <motion.h2
            className="font-headline text-midnight leading-[1.0] text-[clamp(2.4rem,10.5vw,3.2rem)] md:text-[clamp(3rem,6vw,6.5rem)]"
            variants={container}
            initial={prefersReducedMotion ? false : "hidden"}
            whileInView="show"
            viewport={HEADLINE_VIEWPORT}
          >
            {HEADLINE_WORDS.map((word) => (
              <motion.span
                key={word}
                className="block"
                style={{ paddingBottom: "0.06em" }}
                variants={lineReveal}
              >
                {word}
              </motion.span>
            ))}
          </motion.h2>

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
                alt="Meros smoothie"
                width={1080}
                height={1080}
                sizes="(min-width: 768px) 40vw, 70vw"
                style={{ width: "100%", height: "auto" }}
              />
            </motion.div>
          </div>
        </div>

        {/* Bottom strip: divider + pillars */}
        <div className="mt-auto pt-16">
          <motion.div
            className="w-full bg-midnight/20"
            style={{ height: "0.5px", transformOrigin: "left center" }}
            initial={prefersReducedMotion ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={ENTER_VIEWPORT}
            transition={{ duration: 1.3, ease: REVEAL_EASE }}
          />

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 mt-10 gap-10 md:gap-0"
            variants={container}
            initial={prefersReducedMotion ? false : "hidden"}
            whileInView="show"
            viewport={ENTER_VIEWPORT}
          >
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.index}
                className={`pr-12 ${i < PILLARS.length - 1 ? "md:border-r md:border-midnight/15" : ""} ${i > 0 ? "md:pl-12 md:pr-0" : ""}`}
                variants={lineReveal}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-body-caps text-midnight/35 text-[9px] tracking-[0.25em]">
                    {p.index}
                  </span>
                  <div className="h-px flex-1 bg-midnight/20" style={{ maxWidth: 32 }} />
                  <span className="font-body-caps text-midnight text-[10px] tracking-[0.20em]">
                    {p.label}
                  </span>
                </div>
                <p className="font-body-mixed text-midnight/55 text-sm leading-relaxed">
                  {p.body}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
