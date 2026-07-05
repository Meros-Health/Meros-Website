"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { CTAButton } from "@/components/ui/CTAButton";

gsap.registerPlugin(ScrollTrigger);

const BOWL_SIZE = 1080;

// ─── Scroll choreography config ───────────────────────────────────────────────
// Load-bearing "feel" values — do not tune without reading the scaling-title prompt.
const CONFIG = {
  pinDurationVh: 3.2,
  scrub: 0.8,

  phases: {
    titleEnd: 0.46,
    imageEnd: 0.74,
    eyebrowStart: 0.42,
    ctaStart: 0.38,
    ctaEnd: 0.52,
  },

  title: {
    travelVh: 0.3,
    finalScale: 0.55,
    ease: "power2.out",
  },

  image: {
    initialOffsetVh: 0.8,
    finalOffsetVh: -0.03,
    initialScale: 3.0,
    finalScale: 1.0,
    ease: "power3.out",
    transformOrigin: "top center",
  },

  spread: {
    start: 0.45,
    end: 0.74,
    ease: "power3.out",
    xVw: { desktop: 0.14, tablet: 0.11 },
    left: { yVh: 0.06 },
    right: { yVh: 0.06 },
  },
};

const BOWLS = {
  center: {
    src: "/images-web/Transparent/Bounty.png",
    alt: "The Bounty bowl",
  },
  left: {
    src: "/images-web/Transparent/Moment.png",
    alt: "",
  },
  right: {
    src: "/images-web/Transparent/Tropic.png",
    alt: "",
  },
} as const;

const bowlImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
  objectPosition: "center",
  display: "block",
};

export function BuildSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleWrapRef = useRef<HTMLDivElement>(null);
  const titleScaleRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const bowlStageRef = useRef<HTMLDivElement>(null);
  const centerBowlRef = useRef<HTMLDivElement>(null);
  const sideLeftRef = useRef<HTMLDivElement>(null);
  const sideRightRef = useRef<HTMLDivElement>(null);

  const staticSectionRef = useRef<HTMLElement>(null);
  const staticEyebrowRef = useRef<HTMLParagraphElement>(null);
  const staticTitleRef = useRef<HTMLHeadingElement>(null);
  const staticImageRef = useRef<HTMLDivElement>(null);
  const staticCtaRef = useRef<HTMLDivElement>(null);

  const [layoutMode, setLayoutMode] = useState<"pending" | "static" | "scroll">("pending");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mqMobile = window.matchMedia("(max-width: 639px)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const mobile = mqMobile.matches;
      const reduced = mqMotion.matches;
      setPrefersReducedMotion(reduced);
      setLayoutMode(mobile || reduced ? "static" : "scroll");
    };
    update();
    mqMobile.addEventListener("change", update);
    mqMotion.addEventListener("change", update);
    return () => {
      mqMobile.removeEventListener("change", update);
      mqMotion.removeEventListener("change", update);
    };
  }, []);

  const useScrollAnimation = layoutMode === "scroll";
  const useMobileReveal = layoutMode === "static" && !prefersReducedMotion;
  const revealHiddenStyle = useMobileReveal ? { opacity: 0 } : undefined;

  // ── Desktop / tablet: pinned scroll scaling ───────────────────────────────
  useGSAP(
    () => {
      if (!useScrollAnimation || !sectionRef.current) return;

      const p = CONFIG.phases;
      const img = CONFIG.image;
      const spread = CONFIG.spread;
      const spreadDuration = spread.end - spread.start;

      const spreadMagnitude = () =>
        window.innerWidth *
        (window.innerWidth < 900 ? spread.xVw.tablet : spread.xVw.desktop);
      const spreadY = () => window.innerHeight * spread.left.yVh;

      gsap.set(eyebrowRef.current, { opacity: 0 });
      gsap.set(ctaRef.current, { opacity: 0 });

      gsap.set(bowlStageRef.current, {
        y: () => window.innerHeight * img.initialOffsetVh,
      });

      gsap.set(centerBowlRef.current, {
        xPercent: -50,
        yPercent: -50,
        scale: img.initialScale,
        transformOrigin: img.transformOrigin,
      });

      gsap.set([sideLeftRef.current, sideRightRef.current], {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: 0,
        scale: img.finalScale,
        transformOrigin: img.transformOrigin,
        opacity: 0,
      });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${window.innerHeight * CONFIG.pinDurationVh}`,
          pin: true,
          pinSpacing: true,
          scrub: CONFIG.scrub,
          invalidateOnRefresh: true,
        },
      });

      tl.to(
        titleWrapRef.current,
        {
          y: () => -window.innerHeight * CONFIG.title.travelVh,
          ease: CONFIG.title.ease,
          duration: p.titleEnd,
        },
        0
      );

      tl.to(
        titleScaleRef.current,
        {
          scale: CONFIG.title.finalScale,
          ease: CONFIG.title.ease,
          duration: p.titleEnd,
        },
        0
      );

      tl.fromTo(
        bowlStageRef.current,
        { y: () => window.innerHeight * img.initialOffsetVh },
        {
          y: () => window.innerHeight * img.finalOffsetVh,
          ease: img.ease,
          duration: p.imageEnd,
        },
        0
      );

      tl.fromTo(
        centerBowlRef.current,
        {
          xPercent: -50,
          yPercent: -50,
          scale: img.initialScale,
          transformOrigin: img.transformOrigin,
        },
        {
          xPercent: -50,
          yPercent: -50,
          scale: img.finalScale,
          transformOrigin: img.transformOrigin,
          ease: img.ease,
          duration: p.imageEnd,
        },
        0
      );

      tl.fromTo(
        sideLeftRef.current,
        {
          x: 0,
          y: 0,
          scale: img.finalScale,
          transformOrigin: img.transformOrigin,
          opacity: 0,
        },
        {
          x: () => -spreadMagnitude(),
          y: spreadY,
          scale: img.finalScale,
          transformOrigin: img.transformOrigin,
          opacity: 1,
          ease: spread.ease,
          duration: spreadDuration,
        },
        spread.start
      );

      tl.fromTo(
        sideRightRef.current,
        {
          x: 0,
          y: 0,
          scale: img.finalScale,
          transformOrigin: img.transformOrigin,
          opacity: 0,
        },
        {
          x: spreadMagnitude,
          y: spreadY,
          scale: img.finalScale,
          transformOrigin: img.transformOrigin,
          opacity: 1,
          ease: spread.ease,
          duration: spreadDuration,
        },
        spread.start
      );

      tl.to(eyebrowRef.current, { opacity: 1, duration: 0.08 }, p.eyebrowStart);
      tl.to(ctaRef.current, { opacity: 1, duration: p.ctaEnd - p.ctaStart }, p.ctaStart);
    },
    { scope: sectionRef, dependencies: [useScrollAnimation] }
  );

  // ── Mobile: one-time stagger reveal on scroll into view ───────────────────
  useGSAP(
    () => {
      if (!useMobileReveal || !staticSectionRef.current) return;

      const targets = [
        staticEyebrowRef.current,
        staticTitleRef.current,
        staticImageRef.current,
        staticCtaRef.current,
      ].filter(Boolean);

      gsap.set(targets, { opacity: 0, y: 28 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.75,
        stagger: 0.14,
        ease: "power2.out",
        scrollTrigger: {
          trigger: staticSectionRef.current,
          start: "top 78%",
          once: true,
        },
      });
    },
    { scope: staticSectionRef, dependencies: [useMobileReveal] }
  );

  // ── Static layout: mobile, reduced-motion, and initial pending paint ───────
  if (!useScrollAnimation) {
    return (
      <section
        ref={staticSectionRef}
        className="relative w-full bg-cream overflow-hidden py-20 px-[7vw]"
        aria-label="Build A Bowl"
      >
        <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
          <p
            ref={staticEyebrowRef}
            className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]"
            style={revealHiddenStyle}
          >
            Build A Bowl
          </p>

          <h2
            ref={staticTitleRef}
            className="font-headline text-midnight leading-[1.05] uppercase mt-3"
            style={{ fontSize: "clamp(2rem, 9vw, 3.25rem)", ...revealHiddenStyle }}
          >
            Create Your Perfect Bowl.
          </h2>

          <div
            ref={staticImageRef}
            className="mt-8 w-full"
            style={{ maxWidth: "min(72vw, 18rem)", aspectRatio: "1 / 1", ...revealHiddenStyle }}
          >
            <Image
              src={BOWLS.center.src}
              alt={BOWLS.center.alt}
              width={BOWL_SIZE}
              height={BOWL_SIZE}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              priority
            />
          </div>

          <div ref={staticCtaRef} className="mt-8" style={revealHiddenStyle}>
            <CTAButton href="/build" variant="dark">
              Build Your Custom Bowl
            </CTAButton>
          </div>
        </div>
      </section>
    );
  }

  // ── Animated layout (desktop / tablet) ────────────────────────────────────
  return (
    <section
      ref={sectionRef}
      id="st-section"
      className="bg-cream"
      style={{ position: "relative", height: "100vh", overflow: "hidden" }}
      aria-label="Build A Bowl"
    >
      <div style={{ position: "relative", height: "100%", width: "100%" }}>
        <div
          ref={titleWrapRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            pointerEvents: "none",
            willChange: "transform",
          }}
        >
          <div
            ref={titleScaleRef}
            style={{
              position: "relative",
              willChange: "transform",
              maxWidth: "100%",
              padding: "0 1.5rem",
              overflow: "hidden",
            }}
          >
            <p
              ref={eyebrowRef}
              className="font-body-caps text-midnight/50"
              style={{
                position: "absolute",
                top: "-1.75rem",
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                fontSize: "0.7rem",
                letterSpacing: "0.30em",
                willChange: "opacity",
              }}
            >
              Build A Bowl
            </p>
            <h2
              className="font-headline text-midnight"
              style={{
                fontSize: "clamp(1.5rem, 4.75vw, 5.5rem)",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                textAlign: "center",
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
              }}
            >
              CREATE YOUR PERFECT BOWL.
            </h2>
          </div>

          <div
            ref={ctaRef}
            style={{ marginTop: "1.75rem", pointerEvents: "auto", willChange: "opacity" }}
          >
            <CTAButton href="/build" variant="dark">
              Build Your Custom Bowl
            </CTAButton>
          </div>
        </div>

        <div
          ref={bowlStageRef}
          style={{
            position: "absolute",
            top: "34vh",
            bottom: "5vh",
            left: 0,
            right: 0,
            willChange: "transform",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              maxWidth: "min(92vw, 56rem)",
              margin: "0 auto",
              overflow: "hidden",
            }}
          >
            {/* Side bowls — underneath center, translate only */}
            <div
              ref={sideLeftRef}
              aria-hidden
              style={{
                position: "absolute",
                left: "50%",
                top: "42%",
                width: "58%",
                aspectRatio: "1 / 1",
                zIndex: 1,
                willChange: "transform",
              }}
            >
              <Image
                src={BOWLS.left.src}
                alt={BOWLS.left.alt}
                width={BOWL_SIZE}
                height={BOWL_SIZE}
                loading="eager"
                style={bowlImageStyle}
              />
            </div>

            <div
              ref={sideRightRef}
              aria-hidden
              style={{
                position: "absolute",
                left: "50%",
                top: "42%",
                width: "58%",
                aspectRatio: "1 / 1",
                zIndex: 1,
                willChange: "transform",
              }}
            >
              <Image
                src={BOWLS.right.src}
                alt={BOWLS.right.alt}
                width={BOWL_SIZE}
                height={BOWL_SIZE}
                loading="eager"
                style={bowlImageStyle}
              />
            </div>

            {/* Center bowl — on top, scale + shared stage rise */}
            <div
              ref={centerBowlRef}
              style={{
                position: "absolute",
                left: "50%",
                top: "38%",
                width: "58%",
                aspectRatio: "1 / 1",
                zIndex: 2,
                willChange: "transform",
              }}
            >
              <Image
                src={BOWLS.center.src}
                alt={BOWLS.center.alt}
                width={BOWL_SIZE}
                height={BOWL_SIZE}
                loading="eager"
                priority
                style={bowlImageStyle}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
