"use client";

import { useRef } from "react";
import { useRevealReady } from "@/lib/useRevealReady";
import { Reveal } from "@/components/ui/ScrollReveal";
import { CATERING_ACCOUNT_NOTE, CATERING_STEPS } from "@/lib/catering/content";

// The process, in the order it happens. Four steps on one row at desktop, a
// column on mobile; the left rule is what makes it read as a sequence rather
// than four unrelated cards.

const RULE = "0.5px solid rgba(41, 45, 42, 0.15)";

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const show = useRevealReady(ref, "-120px");

  return (
    <section id="how-it-works" ref={ref} className="w-full bg-cream scroll-mt-24">
      <div className="mx-auto w-full max-w-[1600px] px-section-x py-section">
        <Reveal show={show} index={0}>
          <h2
            className="font-headline uppercase leading-[0.95] text-midnight"
            style={{ fontSize: "clamp(1.75rem, 3.6vw, 2.75rem)" }}
          >
            How it works
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4">
          {CATERING_STEPS.map((step, i) => (
            <Reveal key={step.id} show={show} index={1 + i}>
              <div className="flex h-full flex-col gap-3 pt-6" style={{ borderTop: RULE }}>
                <span className="font-body-caps text-grapefruit-text text-[10px] tracking-[0.25em]">
                  Step {i + 1}
                </span>
                <h3 className="font-body-caps text-midnight text-[11px] tracking-[0.18em]">
                  {step.name}
                </h3>
                <p className="font-body-mixed text-midnight/70 leading-relaxed text-[0.875rem]">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* The account area is not built. Saying so is better than a button
            that goes nowhere on a page people reach by scanning a card. */}
        <Reveal show={show} index={1 + CATERING_STEPS.length}>
          <p
            className="font-body-mixed mt-14 max-w-2xl pt-8 leading-relaxed text-[0.875rem] text-midnight/60"
            style={{ borderTop: RULE }}
          >
            {CATERING_ACCOUNT_NOTE}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
