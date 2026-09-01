"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ENTRANCE_EASE } from "@/lib/motion";

// Below-the-fold reveal item. The section owns the trigger (useRevealReady on
// the section element, which also waits for its images to decode) and passes
// `show` down; this component only owns the motion.
//
// House entrance: slow settle on the quint-out curve, short travel, ordered by
// visual hierarchy (index 0 is the most prominent element in the region).
// Reduced motion collapses to an instant, travel-free appearance.

const DURATION_S = 1.15;
const STAGGER_S = 0.14;
const TRAVEL_PX = 16;

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
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : TRAVEL_PX }}
      transition={
        reduced
          ? { duration: 0.15, ease: "linear" }
          : { duration: DURATION_S, delay: delay + index * STAGGER_S, ease: ENTRANCE_EASE }
      }
    >
      {children}
    </motion.div>
  );
}
