"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { usePreloadReady } from "@/components/ui/Preloader";
import { HERO_BG_SRC, HERO_LOGO_SRC } from "@/lib/heroAssets";

// ── Entrance timing ──────────────────────────────────────────────────────
// Everything below is tunable. Each element's `delay` is when it *starts*;
// stagger them by hand until the sequence feels right — nothing here is
// derived, so changing one value won't shift the others.
const TIMING = {
  ease: [0.16, 1, 0.3, 1] as number[],

  // Background photo — soft fade-in on load, no motion after.
  bg: { duration: 1.6, delay: 0 },

  // Logo lockup (image, "MEROS" + "House of Yogurt" baked in) — slow fade
  // reveal. No slide, no scale. Held back so the background reads first.
  logo: { duration: 2.2, delay: 0.8 },

  // "A day's fuel defined by you" — top-down wipe reveal (clip-path), text holds still. Follows the logo.
  subtitle: { duration: 0.9, delay: 3.0 },
} as const;

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function HeroSection() {
  const ready = usePreloadReady();
  const animate = ready ? "visible" : "hidden";

  return (
    <section
      aria-label="Meros — House of Yogurt"
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        overflow: "hidden",
      }}
    >
      {/* ── Background photo + scrim ────────────────────────────────────── */}
      <motion.div
        aria-hidden
        initial="hidden"
        animate={animate}
        variants={fadeIn}
        transition={{ duration: TIMING.bg.duration, delay: TIMING.bg.delay, ease: TIMING.ease }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Image
          src={HERO_BG_SRC}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.48)",
          }}
        />
      </motion.div>

      {/* ── Foreground content ───────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          textAlign: "center",
          padding: "0 1.5rem",
          gap: "clamp(1rem, 3vw, 2rem)",
        }}
      >
        <motion.div
          initial="hidden"
          animate={animate}
          variants={fadeIn}
          transition={{ duration: TIMING.logo.duration, delay: TIMING.logo.delay, ease: TIMING.ease }}
          style={{ width: "clamp(280px, 62vw, 1200px)" }}
        >
          <Image
            src={HERO_LOGO_SRC}
            alt="Meros — House of Yogurt"
            width={2038}
            height={820}
            priority
            style={{ width: "100%", height: "auto" }}
          />
        </motion.div>

        {/* <motion.p
          className="font-body-mixed"
          initial="hidden"
          animate={animate}
          variants={wipeDown}
          transition={{ duration: TIMING.subtitle.duration, delay: TIMING.subtitle.delay, ease: TIMING.ease }}
          style={{
            color: "var(--color-cream)",
            opacity: 0.8,
            fontSize: "clamp(0.8rem, 1.3vw, 1rem)",
          }}
        >
          A day&rsquo;s fuel, defined by you.
        </motion.p> */}
      </div>
    </section>
  );
}
