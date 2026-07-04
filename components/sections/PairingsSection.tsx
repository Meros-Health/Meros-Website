"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { CTAButton } from "@/components/ui/CTAButton";

gsap.registerPlugin(ScrollTrigger);

// ─── Types ────────────────────────────────────────────────────────────────────

interface PairingItem {
  src: string;
  alt: string;
  label: string;
  width: number;
  rotates?: boolean; // subtle rotation animation (bowl only)
}

interface PairingConfig {
  id: string;
  layout: "standard" | "mirrored";
  back: PairingItem;  // image rendered behind (z-1)
  front: PairingItem; // image rendered in front (z-2)
  triggerStart?: string;      // label animation start (default "top 45%")
  imageTriggerStart?: string; // image animation start — set below viewport so anim is already running on entry
  imageTriggerEnd?: string;   // when image animation completes (default "top 20%")
  labelTriggerEnd?: string;   // when label animation completes (default "top 20%")
}

// ─── Pairing data — swap src/label/width here to change what's shown ─────────

const PAIRINGS: PairingConfig[] = [
  {
    id: "rise-moment",
    layout: "standard",
    back:  { src: "/images-web/Transparent/Rise.png",   alt: "The Rise smoothie", label: "THE RISE",   width: 400 },
    front: { src: "/images-web/Transparent/Moment.png", alt: "The Moment bowl",   label: "THE MOMENT", width: 430, rotates: true },
    imageTriggerStart: "top 100%", // starts before card enters viewport
  },
  {
    id: "tropic-cabana",
    layout: "mirrored",
    back:  { src: "/images-web/Transparent/Cabana.png", alt: "The Cabana smoothie", label: "THE CABANA", width: 440 },
    front: { src: "/images-web/Transparent/Tropic.png", alt: "The Tropic bowl",     label: "THE TROPIC", width: 480, rotates: true },
    imageTriggerStart: "top 110%", // starts even earlier relative to viewport
    triggerStart: "top 65%",
    labelTriggerEnd: "top 5%",
  },
];

// ─── Design-size coordinate system (880×700 mobile). Rendered as % of stage. ──

const DESIGN_W = 880;
const DESIGN_H = 700;
const DESIGN_H_DESKTOP = 780;

const DESKTOP_IMAGE_SCALE = 1.12;
const BOWL_ROTATION_START = 16; // degrees — scrubbed to 0 over the same scroll span

const LAYOUTS = {
  mobile: {
    standard: {
      back:       { left:  75, top:  95, zIndex: 1 },
      front:      { left: 240, top: 215, zIndex: 2 },
      backLabel:  { left: 408, top: 215, side: "right" as const, lineWidth: 200 },
      frontLabel: { left: 622, top: 425, side: "right" as const, lineWidth:  50 },
    },
    mirrored: {
      back:       { left: 365, top:  95, zIndex: 1 },
      front:      { left: 120, top: 215, zIndex: 2 },
      backLabel:  { left: 418, top: 215, side: "left"  as const, lineWidth: 200, anchorDot: true },
      frontLabel: { left: 150, top: 425, side: "left"  as const, lineWidth:  50, anchorDot: true },
    },
  },
  desktop: {
    standard: {
      back:       { left:  47, top:  72, zIndex: 1 },
      front:      { left: 214, top: 190, zIndex: 2 },
      backLabel:  { left: 492, top: 200, side: "right" as const, lineWidth: 200 },
      frontLabel: { left: 668, top: 418, side: "right" as const, lineWidth:  50 },
    },
    mirrored: {
      back:       { left: 339, top:  72, zIndex: 1 },
      front:      { left:  91, top: 190, zIndex: 2 },
      backLabel:  { left: 416, top: 200, side: "left"  as const, lineWidth: 200, anchorDot: true },
      frontLabel: { left: 136, top: 418, side: "left"  as const, lineWidth:  50, anchorDot: true },
    },
  },
} as const;

function pctW(n: number) {
  return `${(n / DESIGN_W) * 100}%`;
}

function pctH(n: number, designH = DESIGN_H) {
  return `${(n / designH) * 100}%`;
}

function scaledWidth(width: number, desktop: boolean) {
  return desktop ? Math.round(width * DESKTOP_IMAGE_SCALE) : width;
}

function labelWrapperStyle(
  pos: { left: number; top: number; anchorDot?: boolean },
  designH = DESIGN_H,
) {
  return {
    left: pctW(pos.left),
    top: pctH(pos.top, designH),
    zIndex: 3,
    ...(pos.anchorDot ? { transform: "translateX(-100%)" as const } : {}),
  };
}

// Mobile unchanged; desktop stages grow to let images occupy more space
const STAGE_CLASS =
  "pairing-stage relative shrink-0 max-w-full " +
  "w-[clamp(280px,72vw,880px)] " +
  "lg:w-[clamp(640px,84vw,1140px)]";

// ─── Label sub-component ──────────────────────────────────────────────────────

function PairingLabel({
  text,
  side,
  lineWidth,
}: {
  text: string;
  side: "left" | "right";
  lineWidth: number;
}) {
  const dot = (
    <div
      className="shrink-0 bg-midnight"
      style={{ width: "max(2px, 0.34cqi)", height: "max(2px, 0.34cqi)" }}
    />
  );
  const line = (
    <div
      className="shrink-0 bg-midnight/50"
      style={{
        // cqi = 1% of stage inline size (container-type on .pairing-stage)
        width: `${(lineWidth / DESIGN_W) * 100}cqi`,
        height: 1,
      }}
    />
  );
  const gap = <div className="shrink-0" style={{ width: "max(6px, 1.36cqi)" }} />;
  const name = (
    <span
      className="font-headline text-midnight whitespace-nowrap"
      style={{
        fontSize: "clamp(11px, 1.2cqi + 8px, 14px)",
        letterSpacing: "clamp(0.12em, 0.02cqi + 0.1em, 0.20em)",
      }}
    >
      {text}
    </span>
  );

  // left:  name → gap → line → dot  (terminal points right, toward image)
  // right: dot  → line → gap → name (terminal points left,  toward image)
  return side === "left"
    ? <>{name}{gap}{line}{dot}</>
    : <>{dot}{line}{gap}{name}</>;
}

// ─── PairingCard ──────────────────────────────────────────────────────────────

function PairingCard({
  config,
  prefersReducedMotion,
  layoutMode,
}: {
  config: PairingConfig;
  prefersReducedMotion: boolean;
  layoutMode: "column" | "corners";
}) {
  const cardRef     = useRef<HTMLDivElement>(null);
  const backImgRef  = useRef<HTMLDivElement>(null);
  const frontImgRef = useRef<HTMLDivElement>(null);
  const backLblRef  = useRef<HTMLDivElement>(null);
  const frontLblRef = useRef<HTMLDivElement>(null);

  const isDesktop = layoutMode === "corners";
  const pos = LAYOUTS[isDesktop ? "desktop" : "mobile"][config.layout];
  const designH = isDesktop ? DESIGN_H_DESKTOP : DESIGN_H;
  const isMirrored = config.layout === "mirrored";

  useGSAP(() => {
    if (!cardRef.current) return;

    const backImg  = backImgRef.current;
    const frontImg = frontImgRef.current;
    const backLbl  = backLblRef.current;
    const frontLbl = frontLblRef.current;

    if (prefersReducedMotion) {
      gsap.set([backImg, frontImg], { x: 0, y: 0, rotation: 0, opacity: 1 });
      gsap.set([backLbl, frontLbl], { opacity: 1 });
      return;
    }

    const mm = gsap.matchMedia();

    // Column: lighter fade + small Y settle
    mm.add("(max-width: 1023px)", () => {
      gsap.set([backImg, frontImg], {
        y: -10,
        opacity: 0.85,
        x: 0,
        rotation: 0,
      });
      gsap.set([backLbl, frontLbl], { opacity: 0 });

      gsap.timeline({
        scrollTrigger: {
          trigger: cardRef.current,
          start: "top 85%",
          end: "top 40%",
          scrub: 0.6,
        },
      })
        .to([backImg, frontImg], { y: 0, opacity: 1, duration: 1, ease: "none" }, 0)
        .to(backLbl,  { opacity: 1, duration: 0.5, ease: "none" }, 0.2)
        .to(frontLbl, { opacity: 1, duration: 0.5, ease: "none" }, 0.35);
    });

    // Corners: full scrubbed slide-in
    mm.add("(min-width: 1024px)", () => {
      gsap.set(backImg, {
        x: isMirrored ? 22 : -22,
        y: -16,
        rotation: config.back.rotates ? (isMirrored ? -BOWL_ROTATION_START : BOWL_ROTATION_START) : 0,
        opacity: 1,
      });
      gsap.set(frontImg, {
        x: isMirrored ? -22 : 22,
        y: -16,
        rotation: config.front.rotates ? (isMirrored ? -BOWL_ROTATION_START : BOWL_ROTATION_START) : 0,
        opacity: 1,
      });
      gsap.set([backLbl, frontLbl], { opacity: 0 });

      const labelStart = config.triggerStart ?? "top 45%";
      const imageStart = config.imageTriggerStart ?? labelStart;

      gsap.timeline({
        scrollTrigger: {
          trigger: cardRef.current,
          start: imageStart,
          end: config.imageTriggerEnd ?? "top 20%",
          scrub: 0.8,
        },
      })
        .to(backImg,  { x: 0, y: 0, rotation: 0, duration: 1, ease: "none" }, 0)
        .to(frontImg, { x: 0, y: 0, rotation: 0, duration: 1, ease: "none" }, 0);

      gsap.timeline({
        scrollTrigger: {
          trigger: cardRef.current,
          start: labelStart,
          end: config.labelTriggerEnd ?? "top 20%",
          scrub: 0.8,
        },
      })
        .to(backLbl,  { opacity: 1, duration: 0.5, ease: "none" }, 0.2)
        .to(frontLbl, { opacity: 1, duration: 0.5, ease: "none" }, 0.4);
    });

    return () => mm.revert();
  }, {
    scope: cardRef,
    dependencies: [prefersReducedMotion, layoutMode, config.id],
  });

  return (
    <div
      ref={cardRef}
      className={STAGE_CLASS}
      style={{
        aspectRatio: `${DESIGN_W} / ${designH}`,
        containerType: "inline-size",
      }}
    >
      {/* Back label */}
      <div
        ref={backLblRef}
        className="absolute flex items-center"
        style={labelWrapperStyle(pos.backLabel, designH)}
      >
        <PairingLabel
          text={config.back.label}
          side={pos.backLabel.side}
          lineWidth={pos.backLabel.lineWidth}
        />
      </div>

      {/* Back image */}
      <div
        ref={backImgRef}
        className="absolute"
        style={{
          left: pctW(pos.back.left),
          top: pctH(pos.back.top, designH),
          width: pctW(scaledWidth(config.back.width, isDesktop)),
          zIndex: pos.back.zIndex,
        }}
      >
        <Image
          src={config.back.src}
          alt={config.back.alt}
          width={1080}
          height={1080}
          sizes={isDesktop ? "(min-width: 1024px) 60vw, 1140px" : "(max-width: 1023px) 80vw, 880px"}
          style={{ width: "100%", height: "auto" }}
          priority
        />
      </div>

      {/* Front image */}
      <div
        ref={frontImgRef}
        className="absolute"
        style={{
          left: pctW(pos.front.left),
          top: pctH(pos.front.top, designH),
          width: pctW(scaledWidth(config.front.width, isDesktop)),
          zIndex: pos.front.zIndex,
        }}
      >
        <Image
          src={config.front.src}
          alt={config.front.alt}
          width={1080}
          height={1080}
          sizes={isDesktop ? "(min-width: 1024px) 60vw, 1140px" : "(max-width: 1023px) 80vw, 880px"}
          style={{ width: "100%", height: "auto" }}
          priority
        />
      </div>

      {/* Front label */}
      <div
        ref={frontLblRef}
        className="absolute flex items-center"
        style={labelWrapperStyle(pos.frontLabel, designH)}
      >
        <PairingLabel
          text={config.front.label}
          side={pos.frontLabel.side}
          lineWidth={pos.frontLabel.lineWidth}
        />
      </div>
    </div>
  );
}

// ─── PairingsSection ──────────────────────────────────────────────────────────

const CORNERS_MQ = "(min-width: 1024px)";

export function PairingsSection() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"column" | "corners">("column");

  useEffect(() => {
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cornersMq = window.matchMedia(CORNERS_MQ);

    const syncMotion = () => setPrefersReducedMotion(motionMq.matches);
    const syncLayout = () => {
      setLayoutMode(cornersMq.matches ? "corners" : "column");
      // Rebuild ScrollTrigger measurements after layout mode changes
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };

    syncMotion();
    syncLayout();

    motionMq.addEventListener("change", syncMotion);
    cornersMq.addEventListener("change", syncLayout);
    return () => {
      motionMq.removeEventListener("change", syncMotion);
      cornersMq.removeEventListener("change", syncLayout);
    };
  }, []);

  return (
    <section className="relative w-full bg-cream overflow-x-clip pt-20 lg:pt-32 pb-16 lg:pb-24 px-section-x">
      {/*
        Single column: title (left) → pair1 (left) → pair2 (right) → CTA (center)
        Wide fluid container on desktop; stages shrink with viewport so L/R offset persists.
      */}
      <div className="mx-auto flex w-full max-w-[min(100%,90rem)] flex-col gap-4 lg:gap-5">
        <div className="flex flex-col">
          <div className="flex flex-col items-center">
            <span className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em] mb-2 lg:mb-3">
              Our Menu
            </span>
            <h2
              className="
                text-center
                font-headline text-midnight tracking-headline leading-tight
                text-[clamp(2.25rem,7vw,4.75rem)]
              "
            >
              WHAT WE'RE HAVING 
            </h2>
          </div>

          <div className="flex flex-col -mt-2 lg:-mt-4">
            <div className="self-start">
              <PairingCard
                config={PAIRINGS[0]}
                prefersReducedMotion={prefersReducedMotion}
                layoutMode={layoutMode}
              />
            </div>

            <div className="self-end -mt-14 sm:-mt-20 lg:-mt-32 xl:-mt-48">
              <PairingCard
                config={PAIRINGS[1]}
                prefersReducedMotion={prefersReducedMotion}
                layoutMode={layoutMode}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <CTAButton href="/order" variant="dark">Browse Our Full Menu</CTAButton>
        </div>
      </div>
    </section>
  );
}
