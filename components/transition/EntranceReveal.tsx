"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePageReady } from "./TransitionProvider";
import {
  ENTRANCE_EASE,
  REVEAL_REDUCED_S,
  REVEAL_S,
  REVEAL_STAGGER_S,
  REVEAL_TRAVEL_PX,
} from "@/lib/motion";

const BASE_DELAY_S = 0.1;

interface EntranceRevealProps {
  /** Position in the reveal order; 0 is the most prominent element. */
  index?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

// Above-the-fold reveal gated on the page being ready: waits out the
// first-load preloader and any in-flight page transition, then glides in.
// Below-the-fold sections should keep using whileInView instead.
export function EntranceReveal({ index = 0, className, style, children }: EntranceRevealProps) {
  const ready = usePageReady();
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      style={style}
      initial={false}
      animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : REVEAL_TRAVEL_PX }}
      transition={
        reduced
          ? { duration: REVEAL_REDUCED_S, ease: "linear" }
          : { duration: REVEAL_S, delay: BASE_DELAY_S + index * REVEAL_STAGGER_S, ease: ENTRANCE_EASE }
      }
    >
      {children}
    </motion.div>
  );
}
