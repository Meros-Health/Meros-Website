"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ENTRANCE_EASE,
  REVEAL_REDUCED_S,
  REVEAL_S,
  REVEAL_STAGGER_S,
  REVEAL_TRAVEL_PX,
} from "@/lib/motion";

// Below-the-fold reveal item. The section owns the trigger (useRevealReady on
// the section element, which also waits for its images to decode) and passes
// `show` down; this component only owns the motion.
//
// House entrance: slow settle on the quint-out curve, short travel, ordered by
// visual hierarchy (index 0 is the most prominent element in the region).
// Reduced motion collapses to an instant, travel-free appearance.

interface RevealProps {
  show: boolean;
  /** Position in the reveal order; 0 is the most prominent element. */
  index?: number;
  /** Added to the index-derived delay, for a second group inside one section. */
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function Reveal({ show, index = 0, delay = 0, className, style, children }: RevealProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      style={style}
      initial={false}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : REVEAL_TRAVEL_PX }}
      transition={
        reduced
          ? { duration: REVEAL_REDUCED_S, ease: "linear" }
          : { duration: REVEAL_S, delay: delay + index * REVEAL_STAGGER_S, ease: ENTRANCE_EASE }
      }
    >
      {children}
    </motion.div>
  );
}
