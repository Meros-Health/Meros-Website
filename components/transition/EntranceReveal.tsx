"use client";

import { usePageReady } from "./TransitionProvider";
import { Reveal } from "@/components/ui/ScrollReveal";

// Above-the-fold reveal, gated on the page being ready: it waits out the
// first-load preloader and any in-flight page transition, then glides in.
// Below-the-fold sections use Reveal directly with a whileInView-style gate.
//
// This used to be a copy of Reveal with a different trigger, down to the
// duration, stagger, travel and reduced-motion branch. The only thing it owns
// is the gate and the beat before the first item.

/** Held before the first item so the reveal reads as starting, not as already underway. */
const BASE_DELAY_S = 0.1;

interface EntranceRevealProps {
  /** Position in the reveal order; 0 is the most prominent element. */
  index?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function EntranceReveal({ index = 0, className, style, children }: EntranceRevealProps) {
  const ready = usePageReady();

  return (
    <Reveal show={ready} index={index} delay={BASE_DELAY_S} className={className} style={style}>
      {children}
    </Reveal>
  );
}
