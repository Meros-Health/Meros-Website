"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CoverMode, TransitionPhase } from "./TransitionProvider";
import { ENTRANCE_EASE, ENTRANCE_MS, EXIT_MS, REDUCED_MOTION_MS } from "@/lib/motion";

// Above CartDrawer (130), below Preloader (300). The two never coexist in
// time, but the ordering is free correctness insurance.
const COVER_Z = 140;

interface PageCoverProps {
  phase: TransitionPhase;
  coverMode: CoverMode;
}

// The only file owning the cover's visual. Swap the div's contents or
// animation here (e.g. for a panel wipe) without touching the provider.
export function PageCover({ phase, coverMode }: PageCoverProps) {
  const reduced = useReducedMotion();

  if (phase === "idle") return null;

  const covered = phase === "navigating" || phase === "holding";
  // menu-composed exits stay invisible: the menu's own close animation is the
  // visual cover, and a second fade-in underneath it would be redundant motion.
  const target =
    phase === "entering" ? 0 : covered ? 1 : coverMode === "menu-composed" ? 0 : 1;

  const durationMs =
    phase === "exiting"
      ? coverMode === "menu-composed"
        ? 0
        : reduced
          ? REDUCED_MOTION_MS
          : EXIT_MS
      : phase === "entering"
        ? reduced
          ? REDUCED_MOTION_MS
          : ENTRANCE_MS
        : 0;

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: target }}
      transition={{ duration: durationMs / 1000, ease: reduced ? "linear" : ENTRANCE_EASE }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: COVER_Z,
        // The nav menu's panels close inward to a solid field; a cover of the
        // same colour makes the handoff between them invisible. Link-driven
        // transitions keep the cream fade.
        background: coverMode === "menu-composed" ? "var(--nav-overlay-bg)" : "var(--color-cream)",
        pointerEvents: "auto",
      }}
    />
  );
}
