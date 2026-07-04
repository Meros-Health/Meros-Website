"use client";

import { useRef, useEffect, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PILLARS = [
  {
    index: "01",
    label: "Strained In-House",
    body: "Our yogurt is slow-strained daily — thick, clean, and never from a tub.",
  },
  {
    index: "02",
    label: "Island Sourced",
    body: "Berries, granola, and seasonal toppings direct from Vancouver Island growers.",
  },
  {
    index: "03",
    label: "A Full Meal",
    body: "Every bowl and smoothie is built with macros in mind. Real fuel, nothing missing.",
  },
];

const HEADLINE_WORDS = ["SOURCED.", "STRAINED.", "SERVED."];

export function OurStorySection() {
  const sectionRef    = useRef<HTMLElement>(null);
  const eyebrowRef    = useRef<HTMLSpanElement>(null);
  const headlineRef   = useRef<HTMLHeadingElement>(null);
  const dividerRef    = useRef<HTMLDivElement>(null);
  const pillarsRef    = useRef<HTMLDivElement>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useGSAP(() => {
    if (!sectionRef.current || prefersReducedMotion) return;

    // ── Eyebrow ───────────────────────────────────────────────────────────
    gsap.fromTo(eyebrowRef.current,
      { opacity: 0, x: -12 },
      {
        opacity: 1,
        x: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          once: true,
        },
      }
    );

    // ── Headline: staggered clip reveal per word ──────────────────────────
    const wordInners = headlineRef.current?.querySelectorAll<HTMLElement>(".word-inner");
    if (wordInners?.length) {
      gsap.set(wordInners, { y: "105%" });
      gsap.to(wordInners, {
        y: "0%",
        stagger: 0.14,
        duration: 1.0,
        ease: "power4.out",
        scrollTrigger: {
          trigger: headlineRef.current,
          start: "top 72%",
          once: true,
        },
      });
    }

    // ── Divider: draw from left ───────────────────────────────────────────
    gsap.fromTo(dividerRef.current,
      { scaleX: 0, transformOrigin: "left center" },
      {
        scaleX: 1,
        duration: 1.1,
        ease: "power3.inOut",
        scrollTrigger: {
          trigger: dividerRef.current,
          start: "top 88%",
          once: true,
        },
      }
    );

    // ── Pillars: staggered fade + lift ────────────────────────────────────
    const pillarEls = pillarsRef.current?.querySelectorAll<HTMLElement>(".pillar");
    if (pillarEls?.length) {
      gsap.set(pillarEls, { opacity: 0, y: 20 });
      gsap.to(pillarEls, {
        opacity: 1,
        y: 0,
        stagger: 0.15,
        duration: 0.75,
        ease: "power2.out",
        delay: 0.2,
        scrollTrigger: {
          trigger: pillarsRef.current,
          start: "top 88%",
          once: true,
        },
      });
    }
  }, { scope: sectionRef, dependencies: [prefersReducedMotion] });

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-midnight text-cream"
      style={{ minHeight: "100svh" }}
    >
      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex flex-col min-h-[100svh] px-section-x py-16 md:py-24">

        {/* Eyebrow */}
        <div className="mb-auto">
          <span
            ref={eyebrowRef}
            className="font-body-caps text-cream/50 text-[10px] tracking-[0.30em]"
            style={{ opacity: 0 }}
          >
            Our Story
          </span>
        </div>

        {/* Headline */}
        <h2
          ref={headlineRef}
          className="font-headline text-cream leading-[1.0] mt-auto mb-auto text-[clamp(2.4rem,10.5vw,3.2rem)] md:text-[clamp(3.8rem,8.5vw,9.5rem)]"
        >
          {HEADLINE_WORDS.map((word) => (
            <span
              key={word}
              className="block overflow-hidden"
              style={{ paddingBottom: "0.06em" }}
            >
              <span className="word-inner block">{word}</span>
            </span>
          ))}
        </h2>

        {/* Bottom strip: divider + pillars */}
        <div className="mt-auto pt-16">
          <div ref={dividerRef} className="w-full bg-cream/20" style={{ height: "0.5px" }} />

          <div ref={pillarsRef} className="grid grid-cols-1 md:grid-cols-3 mt-10 gap-10 md:gap-0">
            {PILLARS.map((p, i) => (
              <div
                key={p.index}
                className={`pillar pr-12 ${i < PILLARS.length - 1 ? "md:border-r md:border-cream/15" : ""} ${i > 0 ? "md:pl-12 md:pr-0" : ""}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-body-caps text-cream/35 text-[9px] tracking-[0.25em]">
                    {p.index}
                  </span>
                  <div className="h-px flex-1 bg-cream/20" style={{ maxWidth: 32 }} />
                  <span className="font-body-caps text-cream text-[10px] tracking-[0.20em]">
                    {p.label}
                  </span>
                </div>
                <p className="font-body-mixed text-cream/55 text-sm leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
