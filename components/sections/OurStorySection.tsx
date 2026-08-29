"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useLenis } from "@/components/animation/LenisProvider";
import { splitDeck } from "@/lib/ourStory/splitDeck";

import { useRevealReady } from "@/lib/useRevealReady";

gsap.registerPlugin(ScrollTrigger);

// ─── Content ─────────────────────────────────────────────────────────────────
// The four core values, in process order: sourced → strained → served → fuel.
// `image` is a stand-in from the existing library until the process shoot
// lands; swapping a photo is a one-line edit here. Card backs carry the
// longer read.
const STORY_VALUES = [
  {
    num: "01",
    headline: "LOCALLY SOURCED.",
    label: "Locally Sourced",
    body: "Sourced as locally as possible, with trusted local vendors for the rest.",
    image: "/images-web/Gallery/Gallery-6.jpg",
    alt: "Fresh fruit, honey, and toppings laid out on the counter",
    backHeadline: "As local as it gets.",
    backBody:
      "Fruit and toppings are grown as locally as possible; the rest comes from trusted vendors. We are always working toward the freshest, most local ingredients we can get.",
    factLine: "Local raw honey. Canadian maple syrup.",
  },
  {
    num: "02",
    headline: "STRAINED IN-HOUSE.",
    label: "Strained In-House",
    body: "Yogurt strained daily for higher protein and a thicker texture.",
    image: "/images-web/Bowls/Plain-1.jpg",
    alt: "A bowl of thick, plain strained yogurt",
    backHeadline: "Strained for 24 hours.",
    backBody:
      "Our yogurt is strained for 24 hours, every day. Straining draws off the whey, which is what makes it thick and pushes the protein up: a cup of our plain lands at 17 g, and the 0% high-protein at 24 g.",
    factLine: "17 g protein per cup, plain. 24 g, high-protein.",
  },
  {
    num: "03",
    headline: "SERVED FRESH.",
    label: "Served Fresh",
    body: "Bowls and smoothies made when you order them.",
    image: "/images-web/Bowls/Hand-Bowl-3.jpg",
    alt: "A bowl being finished by hand",
    backHeadline: "Built when you order.",
    backBody:
      "Bowls and smoothies are built with real ingredients right after you order them. Nothing sits waiting under a lid.",
    factLine: "Made to order.",
  },
  {
    num: "04",
    headline: "DAILY FUEL.",
    label: "Daily Fuel",
    body: "A meal's worth of protein and calories in one bowl.",
    image: "/images-web/Bowls/Silk-1.jpg",
    alt: "The Silk bowl",
    backHeadline: "A meal, not a snack.",
    backBody:
      "A medium Silk bowl comes to 481 calories and 16 g of protein; the large, 552 and 19 g. Every item on the menu lists its calories and protein, so you know what a bowl is doing for you.",
    factLine: "481 cal, 16 g protein. Medium Silk.",
  },
] as const;

const COUNT = STORY_VALUES.length;

// ─── Fan geometry (tweak these) ──────────────────────────────────────────────
// Every card shares one pivot below the deck, so the spread reads like a hand
// of photos opening. Angles are the END state; the deck starts loosely stacked.
const FAN_ANGLES = [-30, -10, 10, 30];       // deg, desktop end state
const STACK_ANGLES = [-8, -3, 3, 8];         // deg, start state (already a loose deck)
const FAN_PIVOT = "50% 120%";                // transform-origin: the "hand" below the cards

// Stacked layout (<1024px): no fan. Each value carries its own card, which
// slides and settles as it scrolls into view, then rests at a slight tilt.
const STACKED_REST_ANGLES = [-3, 2.5, -3, 2.5];   // deg, resting tilt per card
const STACKED_START_ANGLES = [-9, 8, -9, 8];      // deg, before it settles
const STACKED_SLIDE_X = 28;                        // px, from the side it leans toward
const STACKED_SLIDE_Y = 24;                        // px, drifts up as it settles
const CARD_SHADOW = "0 30px 60px rgba(41,45,42,0.18)";
const CARD_PERSPECTIVE = 1400;               // px, on the wrapper, during the 3D flip only
// Desktop subtitle: font-size as a share of the fan column width (cqw), so the
// longest body (560px at 17px) stays on one line. 17 / 560 = 3.04; 2.94 keeps margin.
const SUBTITLE_CQW = 2.94;

// ─── Scroll-driven timeline (no pin) ─────────────────────────────────────────
// The section scrolls normally. One timeline is scrubbed from the point where
// the composition's top is well into the viewport (the subtitle and first
// headline are readable) until its centre sits just above the middle of the
// screen, then it holds its end state while the section scrolls away.
const SCRUB_START = "top 80%";
const SCRUB_END = "center 46%";   // ends with the subtitle still clear of the sticky header
const SCRUB_LAG = 1;              // seconds of catch-up; smooths trackpad spikes
// Rail states. Progressive: once the line reaches a value it stays lit.
const HEADLINE_DIM = 0.2;
const NUMERAL_DIM = "rgba(41,45,42,0.5)";
const NUMERAL_ON = "#292D2A";
const POINT_DIM = "rgba(41,45,42,0.3)";
const POINT_ON = "#292D2A";

// ─── Card interaction ────────────────────────────────────────────────────────
// Click picks a card out of the hand. Step 1: the card and everything drawn
// beneath it move left while the cards drawn over it move right (and close
// up behind their top card), until the picked card is fully visible. No
// z-order ever changes. Step 2: it flips. The geometry is solved per click by
// lib/ourStory/splitDeck.ts against the headline text and the viewport edge.
// Close on click, outside click, Escape, resize, or SCROLL_CLOSE_PX of scroll.
const SEPARATE_DURATION = 0.9;
const SEPARATE_EASE = "power3.inOut";
const FLIP_START_RATIO = 0.7;     // the flip begins this far into the separation
const FLIP_DURATION = 0.8;
const FLIP_EASE = "power2.inOut";
const CLOSE_FLIP_DURATION = 0.6;
const CLOSE_GROUP_DURATION = 0.7;
const CLOSE_GROUP_DELAY = 0.15;   // s after the flip-back starts before the groups return
const OTHERS_VEIL = 0.45;         // cream veil over the three cards that are not open (not opacity: stacked cards must stay opaque)
const HOVER_LIFT = -8;            // px, desktop hover
const HEADLINE_MARGIN = 24;       // px kept between the left group and the headline text
const EDGE_MARGIN = 8;            // px kept between the right group and the viewport edge
const SCROLL_CLOSE_PX = 60;
const CARD_HINT = "Tap a card to read more";

// One-time entry reveal for the stacked layout (site motion standard).
const REVEAL = { duration: 1.1, stagger: 0.14, y: 18, ease: "power4.out" } as const;

// Layout mode. "pending" renders the static end state (also the SSR output and
// what no-JS / reduced-motion users get), then the effect picks scroll vs stacked.
type LayoutMode = "pending" | "stacked" | "scroll";

function useLayoutMode() {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("pending");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [compact, setCompact] = useState(false); // small desktop: shorter card backs

  useEffect(() => {
    const mqNarrow = window.matchMedia("(max-width: 1023px)");
    const mqCompact = window.matchMedia("(max-width: 1199px)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setPrefersReducedMotion(mqMotion.matches);
      setLayoutMode(mqNarrow.matches ? "stacked" : "scroll");
      setCompact(mqCompact.matches && !mqNarrow.matches);
    };
    update();
    mqNarrow.addEventListener("change", update);
    mqCompact.addEventListener("change", update);
    mqMotion.addEventListener("change", update);
    return () => {
      mqNarrow.removeEventListener("change", update);
      mqCompact.removeEventListener("change", update);
      mqMotion.removeEventListener("change", update);
    };
  }, []);

  return { layoutMode, prefersReducedMotion, compact };
}

// ─── Card refs: one set per layer, so no two tweens share a transform ─────────
type Refs<T> = React.MutableRefObject<(T | null)[]>;
interface CardRefs {
  slot: Refs<HTMLDivElement>;      // scroll timeline: rotation only
  wrapper: Refs<HTMLDivElement>;   // open/close: x, y, counter-rotation, scale, opacity
  flipper: Refs<HTMLDivElement>;   // flip: rotationY only
  front: Refs<HTMLButtonElement>;
  back: Refs<HTMLDivElement>;
  veil: Refs<HTMLDivElement>;      // cream overlay on the front face, for the dimmed state
}

const backId = (i: number) => `our-story-card-back-${i}`;
const backHeadingId = (i: number) => `our-story-card-back-heading-${i}`;

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
    </svg>
  );
}

function FanCard({
  value,
  index,
  angle,
  pivot,
  refs,
  open,
  reducedMotion,
  onToggle,
  onHover,
}: {
  value: (typeof STORY_VALUES)[number];
  index: number;
  angle: number;
  pivot: string;
  refs: CardRefs;
  open: boolean;
  reducedMotion: boolean;
  onToggle: (i: number) => void;
  onHover: (i: number, entering: boolean) => void;
}) {
  return (
    // POSITIONER: CSS centring + z-index only. GSAP never touches it, so the
    // Tailwind translate and the animated transforms below never fight. The
    // positioning layers are transparent to the pointer: their unrotated boxes
    // would otherwise sit over the centre of the stage and swallow clicks meant
    // for the visible strip of a card beneath. Only the faces take hits.
    <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2" style={{ width: "var(--card-w)", zIndex: index + 1 }}>
      {/* SLOT: the scroll timeline rotates this about the shared pivot. */}
      <div
        ref={(el) => { refs.slot.current[index] = el; }}
        style={{ transform: `rotate(${angle}deg)`, transformOrigin: pivot }}
      >
        {/* WRAPPER: open/close moves and straightens this. It carries no
            background of its own: the cream and the shadow sit on the faces,
            so the whole card turns as one during the flip.

            The card is FLAT at rest. perspective, preserve-3d, and
            backface-visibility are applied by GSAP (enter3D) only for the
            duration of a flip and removed again (exit3D) once it lands. Left
            on, they make every face a composited layer: the browser
            rasterises it axis-aligned and resamples it through the resting
            tilt, which softens text and photo (and in WebKit the hidden back
            can bleed through mirrored). At rest the back is simply
            visibility: hidden. */}
        <div ref={(el) => { refs.wrapper.current[index] = el; }}>
          {/* FLIPPER: the flip rotates this on Y. */}
          <div ref={(el) => { refs.flipper.current[index] = el; }} className="relative">
            {/* FRONT */}
            <button
              ref={(el) => { refs.front.current[index] = el; }}
              type="button"
              aria-expanded={open}
              aria-controls={backId(index)}
              onClick={() => onToggle(index)}
              onPointerEnter={(e) => { if (e.pointerType === "mouse") onHover(index, true); }}
              onPointerLeave={(e) => { if (e.pointerType === "mouse") onHover(index, false); }}
              className="relative block w-full cursor-pointer border-0 bg-cream p-0 text-left"
              style={{
                boxShadow: CARD_SHADOW,
                pointerEvents: open ? "none" : "auto",  // re-enables hits below the pointer-events-none positioner
              }}
            >
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: "300 / 340" }}>
                <Image
                  src={value.image}
                  alt={value.alt}
                  fill
                  sizes="(min-width: 1024px) 22vw, 260px"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="flex items-center justify-between px-4" style={{ height: "var(--card-foot)" }}>
                <span className="font-body-caps text-[10px] text-midnight">{value.num}</span>
                <span className="font-body-caps text-[10px] text-midnight">{value.label}</span>
              </div>
              <div
                ref={(el) => { refs.veil.current[index] = el; }}
                className="pointer-events-none absolute inset-0 bg-cream"
                style={{ opacity: 0 }}
                aria-hidden
              />
            </button>

            {/* BACK: hidden at rest. A flip pre-rotates it 180deg (enter3D)
                so the turn reveals it; in reduced motion it crossfades in
                place instead. visibility and opacity are GSAP-owned after
                mount, so React must not rewrite them on re-render. */}
            <div
              ref={(el) => { refs.back.current[index] = el; }}
              id={backId(index)}
              role="region"
              aria-labelledby={backHeadingId(index)}
              aria-hidden={!open}
              onClick={() => { if (open) onToggle(index); }}
              className="absolute inset-0 flex flex-col gap-2 overflow-hidden bg-cream text-midnight"
              style={{
                padding: "clamp(14px, calc(var(--card-w) * 0.07), 20px)",
                boxShadow: CARD_SHADOW,
                visibility: "hidden",
                opacity: reducedMotion ? 0 : 1,
                pointerEvents: open ? "auto" : "none",
              }}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={(e) => { e.stopPropagation(); onToggle(index); }}
                className="absolute right-0 top-0 flex h-11 w-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-midnight/70 hover:text-midnight"
              >
                <CloseIcon />
              </button>
              <div className="flex items-center gap-3 pr-10">
                <span className="font-body-caps text-[10px]">{value.num}</span>
                <span className="font-body-caps text-[10px]">{value.label}</span>
              </div>
              <h3
                id={backHeadingId(index)}
                className="font-headline leading-[1.1]"
                style={{ fontSize: "clamp(0.95rem, calc(var(--card-w) * 0.068), 1.4rem)", marginTop: "0.3em" }}
              >
                {value.backHeadline}
              </h3>
              <p
                className="font-body-mixed text-midnight/70"
                style={{
                  fontSize: "clamp(11px, calc(var(--card-w) * 0.048), 15px)",
                  lineHeight: 1.55,
                  // Clamp to --back-lines with an ellipsis; set inline so it does
                  // not depend on a utility class surviving the CSS build.
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: "var(--back-lines)",
                  overflow: "hidden",
                }}
              >
                {value.backBody}
              </p>
              <span className="mt-auto shrink-0 pt-2 font-body-caps text-[10px] leading-relaxed text-midnight/60">
                {value.factLine}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FanStage({
  angles,
  refs,
  openIndex,
  reducedMotion,
  onToggle,
  onHover,
  stageRef,
}: {
  angles: number[];
  refs: CardRefs;
  openIndex: number | null;
  reducedMotion: boolean;
  onToggle: (i: number) => void;
  onHover: (i: number, entering: boolean) => void;
  stageRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={stageRef} className="flex flex-col items-center">
      {/* Height = card height + room for the outer cards to drop as they rotate
          about the far pivot, so nothing clips and nothing below shifts. */}
      <div
        className="relative w-full"
        style={{ height: "calc(var(--card-w) * 340 / 300 + var(--card-foot) + 80px)" }}
      >
        {STORY_VALUES.map((value, i) => (
          <FanCard
            key={value.num}
            value={value}
            index={i}
            angle={angles[i]}
            pivot={FAN_PIVOT}
            refs={refs}
            open={openIndex === i}
            reducedMotion={reducedMotion}
            onToggle={onToggle}
            onHover={onHover}
          />
        ))}
      </div>
      <span className="font-body-caps text-[10px] text-midnight/50">{CARD_HINT}</span>
    </div>
  );
}

// Stacked layout: one card in flow under its value, tilted about its centre.
function CardStage({
  index,
  refs,
  open,
  reducedMotion,
  onToggle,
  onHover,
  stageRef,
  hint,
}: {
  index: number;
  refs: CardRefs;
  open: boolean;
  reducedMotion: boolean;
  onToggle: (i: number) => void;
  onHover: (i: number, entering: boolean) => void;
  stageRef: (el: HTMLDivElement | null) => void;
  hint: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={stageRef}
        className="relative"
        style={{
          width: "var(--card-w)",
          height: "calc(var(--card-w) * 340 / 300 + var(--card-foot) + 24px)",
          paddingTop: "12px",
        }}
      >
        <FanCard
          value={STORY_VALUES[index]}
          index={index}
          angle={STACKED_REST_ANGLES[index]}
          pivot="50% 50%"
          refs={refs}
          open={open}
          reducedMotion={reducedMotion}
          onToggle={onToggle}
          onHover={onHover}
        />
      </div>
      {hint && <span className="font-body-caps text-[10px] text-midnight/50">{CARD_HINT}</span>}
    </div>
  );
}

function Point({ pointRef, on }: { pointRef: (el: HTMLDivElement | null) => void; on: boolean }) {
  return (
    <div
      ref={pointRef}
      className="h-[7px] w-[7px]"
      style={{ backgroundColor: on ? POINT_ON : POINT_DIM }}
    />
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function OurStorySection() {
  const { layoutMode, prefersReducedMotion, compact } = useLayoutMode();
  const scrollMode = layoutMode === "scroll" && !prefersReducedMotion;
  const stackedMode = layoutMode === "stacked";
  const stackedReveal = stackedMode && !prefersReducedMotion;
  const lenis = useLenis();

  const sectionRef = useRef<HTMLElement>(null);
  const compositionRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  // The whole composition holds at opacity 0 until every card photo has
  // decoded. The scroll-scrubbed fan keeps running underneath; only its
  // visibility waits.
  const compositionShow = useRevealReady(compositionRef, "0px");
  const railRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);
  const pointRefs = useRef<(HTMLDivElement | null)[]>([]);
  const numeralRefs = useRef<(HTMLElement | null)[]>([]);
  const headlineRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const bodyRefs = useRef<(HTMLElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);          // desktop fan stage
  const cardStageRefs = useRef<(HTMLDivElement | null)[]>([]);  // stacked: one stage per card

  const cardRefs = useRef<CardRefs>({
    slot: { current: [] },
    wrapper: { current: [] },
    flipper: { current: [] },
    front: { current: [] },
    back: { current: [] },
    veil: { current: [] },
  }).current;

  // ── Card interaction state ───────────────────────────────────────────────
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openIndexRef = useRef<number | null>(null);
  const settledOpenRef = useRef(false);     // true only once the open motion has finished
  // The one in-flight timeline. Every open, switch, or close retargets all
  // four cards from their live values, so a single timeline is enough.
  const deckTl = useRef<gsap.core.Timeline | null>(null);
  const reducedRef = useRef(prefersReducedMotion);
  reducedRef.current = prefersReducedMotion;

  useEffect(() => {
    openIndexRef.current = openIndex;
    // Keep hidden backs out of the tab order and away from screen readers.
    cardRefs.back.current.forEach((b, i) => {
      if (b) (b as HTMLElement & { inert: boolean }).inert = openIndex !== i;
    });
  }, [openIndex, cardRefs]);

  // Rail geometry: the line runs from the centre of the first point to the
  // centre of the last, whatever the headline wrapping does. Measured, not guessed.
  const fitRail = () => {
    const rail = railRef.current;
    const stack = stackRef.current;
    const first = pointRefs.current[0];
    const last = pointRefs.current[COUNT - 1];
    if (!rail || !stack || !first || !last) return;
    const stackTop = stack.getBoundingClientRect().top;
    const a = first.getBoundingClientRect();
    const b = last.getBoundingClientRect();
    const top = a.top + a.height / 2 - stackTop;
    const bottom = b.top + b.height / 2 - stackTop;
    rail.style.top = `${top}px`;
    rail.style.height = `${bottom - top}px`;
  };

  // The rail is measured, so it has to be re-measured whenever the headlines
  // can move: layout mode change, resize, and Montage Serif arriving.
  useEffect(() => {
    if (layoutMode === "pending") return;
    fitRail();
    document.fonts?.ready.then(() => {
      fitRail();
      ScrollTrigger.refresh();
    });
    const onResize = () => fitRail();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [layoutMode]);

  // While a card is open, the scroll timeline may still be settling (scrub
  // lag). Keep the open card straight by tracking its slot's rotation.
  const syncOpenCard = () => {
    const i = openIndexRef.current;
    if (i == null || !settledOpenRef.current || reducedRef.current) return;
    const slot = cardRefs.slot.current[i];
    const wrapper = cardRefs.wrapper.current[i];
    if (!slot || !wrapper) return;
    gsap.set(wrapper, { rotation: -(gsap.getProperty(slot, "rotation") as number) });
  };

  // ── Desktop: one scrubbed timeline, no pin ───────────────────────────────
  useGSAP(
    () => {
      if (!scrollMode || !compositionRef.current) return;

      const slots = cardRefs.slot.current.filter(Boolean);
      const points = pointRefs.current.filter(Boolean);
      const numerals = numeralRefs.current.filter(Boolean);
      const headlines = headlineRefs.current.filter(Boolean);
      const bodies = bodyRefs.current.filter(Boolean);

      // Start state. Rendered markup is the end state, so set the beginning here.
      gsap.set(slots, { rotation: (i: number) => STACK_ANGLES[i] });
      gsap.set(points, { backgroundColor: POINT_DIM });
      gsap.set(numerals, { color: NUMERAL_DIM });
      gsap.set(headlines, { opacity: HEADLINE_DIM });
      gsap.set(bodies, { opacity: 0 });
      gsap.set(railFillRef.current, { scaleY: 0, transformOrigin: "top" });

      // One unit of timeline per value. Scrub makes real time irrelevant; the
      // ratios between tweens are what set the feel.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: compositionRef.current,
          start: SCRUB_START,
          end: SCRUB_END,
          scrub: SCRUB_LAG,
          invalidateOnRefresh: true,
          onUpdate: syncOpenCard,
        },
      });

      // The fan opens across the whole travel, the line fills alongside it.
      tl.to(slots, { rotation: (i: number) => FAN_ANGLES[i], duration: COUNT }, 0);
      tl.to(railFillRef.current, { scaleY: 1, duration: COUNT }, 0);

      // Progress, not selection: as the line reaches each point, that value
      // lights up and stays lit. Only the subtitle crossfades to the newest.
      STORY_VALUES.forEach((_, i) => {
        // 01 lights up almost immediately so the block never reads as "off".
        const at = i === 0 ? 0.05 : i + 0.15;
        tl.to(points[i], { backgroundColor: POINT_ON, duration: 0.2 }, at);
        tl.to(numerals[i], { color: NUMERAL_ON, duration: 0.3 }, at);
        tl.to(headlines[i], { opacity: 1, duration: 0.6 }, at);
        if (i > 0) tl.to(bodies[i - 1], { opacity: 0, duration: 0.3 }, at + 0.1);
        tl.to(bodies[i], { opacity: 1, duration: 0.5 }, i === 0 ? at : at + 0.3);
      });
    },
    { scope: sectionRef, dependencies: [scrollMode] }
  );

  // ── Stacked (<1024px): entry reveals + a short fan scrub ─────────────────
  useGSAP(
    () => {
      if (!stackedReveal || !sectionRef.current) return;

      // Line fills as the stack moves through the viewport.
      gsap.set(railFillRef.current, { scaleY: 0, transformOrigin: "top" });
      gsap.to(railFillRef.current, {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: stackRef.current,
          start: "top 70%",
          end: "bottom 65%",
          scrub: SCRUB_LAG,
          invalidateOnRefresh: true,
        },
      });

      // Each card slides and settles into its resting tilt as it comes into view.
      STORY_VALUES.forEach((_, i) => {
        const slot = cardRefs.slot.current[i];
        const stage = cardStageRefs.current[i];
        if (!slot || !stage) return;
        const lean = Math.sign(STACKED_REST_ANGLES[i]) || 1;
        gsap.fromTo(
          slot,
          { rotation: STACKED_START_ANGLES[i], x: lean * STACKED_SLIDE_X, y: STACKED_SLIDE_Y },
          {
            rotation: STACKED_REST_ANGLES[i],
            x: 0,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: stage,
              start: "top 92%",
              end: "top 45%",
              scrub: SCRUB_LAG,
              invalidateOnRefresh: true,
              onUpdate: syncOpenCard,
            },
          }
        );
      });

      // Each value reveals once, top to bottom, point first.
      STORY_VALUES.forEach((_, i) => {
        const point = pointRefs.current[i];
        const targets = [numeralRefs.current[i], headlineRefs.current[i], bodyRefs.current[i]].filter(Boolean);
        gsap.set(point, { backgroundColor: POINT_DIM });
        gsap.set(targets, { opacity: 0, y: REVEAL.y });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: headlineRefs.current[i], start: "top 82%", once: true },
        });
        tl.to(point, { backgroundColor: POINT_ON, duration: 0.6, ease: "power2.out" }, 0);
        tl.to(targets, { opacity: 1, y: 0, duration: REVEAL.duration, stagger: REVEAL.stagger, ease: REVEAL.ease }, 0.05);
      });
    },
    { scope: sectionRef, dependencies: [stackedReveal] }
  );

  // ── Card open / close ────────────────────────────────────────────────────
  const { contextSafe } = useGSAP({ scope: sectionRef });

  // Where every wrapper has to go for card `i` to be the open one. Read from
  // the live layout each time, so it is right whatever the scroll timeline,
  // a previous open, or a hover lift has done to the cards.
  const planOpen = (i: number) => {
    const slots = cardRefs.slot.current;
    const wrapper = cardRefs.wrapper.current[i];
    if (!wrapper || slots.some((s) => !s)) return null;

    const cards = slots.map((slot) => {
      const r = slot!.getBoundingClientRect();
      return {
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        angle: gsap.getProperty(slot, "rotation") as number,
      };
    });

    // Stacked layout: nothing overlaps, so the picked card just straightens
    // in place; the other cards are left alone.
    if (stackedMode) {
      const targets = cards.map((c, k) => ({ x: 0, y: 0, rotation: k === i ? -c.angle : 0 }));
      return { targets, bleed: 0, dim: false };
    }

    // Desktop: the left group stops short of the headline text.
    let leftBoundary = EDGE_MARGIN;
    if (stackRef.current) {
      let textRight = -Infinity;
      stackRef.current.querySelectorAll("h2").forEach((h) => {
        const range = document.createRange();
        range.selectNodeContents(h);
        Array.from(range.getClientRects()).forEach((rect) => {
          textRight = Math.max(textRight, rect.right);
        });
      });
      if (Number.isFinite(textRight)) leftBoundary = textRight + HEADLINE_MARGIN;
    }

    const { moves, bleed } = splitDeck({
      cards,
      selected: i,
      cardW: wrapper.offsetWidth,
      cardH: wrapper.offsetHeight,
      leftBoundary,
      rightBoundary: window.innerWidth - EDGE_MARGIN,
    });

    // The wrapper is a child of the rotated slot, so a screen-space shift has
    // to be expressed in the slot's rotated frame before it can be tweened.
    const targets = moves.map((m, k) => {
      const theta = (cards[k].angle * Math.PI) / 180;
      return {
        x: m.dx * Math.cos(theta),
        y: -m.dx * Math.sin(theta),   // also clears any hover lift
        rotation: m.dRotation,
      };
    });
    return { targets, bleed, dim: true };
  };

  // ── 3D context ──────────────────────────────────────────────────────────
  // Cards are flat at rest (see the WRAPPER note in FanCard): a composited
  // 3D layer is rasterised axis-aligned and resampled through the resting
  // tilt, which softens text and photo. So the 3D properties exist only
  // while a card is turning. Nothing at rest may carry a 3D transform either.
  const flatIndexRef = useRef<number | null>(null);  // the open card, once landed
  const closingRef = useRef<number | null>(null);    // card whose close is in flight
  const set3D = (i: number, on: boolean) => {
    const wrapper = cardRefs.wrapper.current[i];
    const flipper = cardRefs.flipper.current[i];
    const front = cardRefs.front.current[i];
    const back = cardRefs.back.current[i];
    if (!wrapper || !flipper || !front || !back) return;
    wrapper.style.setProperty("perspective", on ? `${CARD_PERSPECTIVE}px` : "");
    flipper.style.setProperty("transform-style", on ? "preserve-3d" : "");
    for (const face of [front, back]) {
      face.style.setProperty("backface-visibility", on ? "hidden" : "");
      face.style.setProperty("-webkit-backface-visibility", on ? "hidden" : "");
    }
  };
  // Make card i a turnable object: back pre-rotated behind the front, both
  // faces one-sided. Idempotent, so a card caught mid-turn can be re-armed.
  const arm = (i: number) => {
    set3D(i, true);
    gsap.set(cardRefs.back.current[i], { rotationY: 180, visibility: "inherit" });
  };
  // The closed rest state: a plain 2D element with the back hidden.
  const restClosed = (i: number) => {
    gsap.set(cardRefs.flipper.current[i], { rotationY: 0 });
    gsap.set(cardRefs.back.current[i], { rotationY: 0, visibility: "hidden" });
    gsap.set(cardRefs.front.current[i], { visibility: "inherit" });
    set3D(i, false);
    if (closingRef.current === i) closingRef.current = null;
  };
  // The open rest state: flipper and back at 0, front hidden, no 3D context.
  const flatten = (i: number) => {
    gsap.set(cardRefs.flipper.current[i], { rotationY: 0 });
    gsap.set(cardRefs.back.current[i], { rotationY: 0 });
    gsap.set(cardRefs.front.current[i], { visibility: "hidden" });
    set3D(i, false);
    flatIndexRef.current = i;
  };
  // Put the turned 3D state back so a close can animate from it.
  const unflatten = (i: number) => {
    if (flatIndexRef.current !== i) return;
    gsap.set(cardRefs.front.current[i], { visibility: "inherit" });
    arm(i);
    gsap.set(cardRefs.flipper.current[i], { rotationY: 180 });
    flatIndexRef.current = null;
  };

  const openCard = contextSafe((i: number) => {
    const plan = planOpen(i);
    if (!plan) return;
    const previous = openIndexRef.current;
    if (previous != null && previous !== i) unflatten(previous);
    // Killing the shared timeline would freeze a third card mid-close
    // (Escape, then a quick tap elsewhere); snap that one shut first.
    const closing = closingRef.current;
    if (closing != null && closing !== i && closing !== previous) restClosed(closing);
    deckTl.current?.kill();
    settledOpenRef.current = false;

    const wrappers = cardRefs.wrapper.current;
    const veils = cardRefs.veil.current;
    const flipper = cardRefs.flipper.current[i];
    const prevFlipper = previous != null && previous !== i ? cardRefs.flipper.current[previous] : null;

    if (reducedRef.current) {
      // No motion, no 3D: everything jumps to its place, then the faces crossfade.
      wrappers.forEach((w, k) => w && gsap.set(w, plan.targets[k]));
      veils.forEach((v, k) => v && gsap.set(v, { opacity: plan.dim && k !== i ? OTHERS_VEIL : 0 }));
      if (previous != null && previous !== i) {
        const prevBack = cardRefs.back.current[previous];
        gsap.to(cardRefs.front.current[previous], { opacity: 1, duration: 0.4 });
        gsap.to(prevBack, { opacity: 0, duration: 0.4, onComplete: () => gsap.set(prevBack, { visibility: "hidden" }) });
      }
      gsap.set(cardRefs.back.current[i], { visibility: "inherit" });
      gsap.to(cardRefs.front.current[i], { opacity: 0, duration: 0.4 });
      gsap.to(cardRefs.back.current[i], { opacity: 1, duration: 0.4 });
      settledOpenRef.current = true;
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        settledOpenRef.current = true;
        flatten(i);
        if (previous != null && previous !== i) restClosed(previous);
      },
    });
    // The 3D context exists only while the card turns: armed as the flip
    // begins, removed when it lands (flatten / restClosed).
    tl.call(() => arm(i), undefined, SEPARATE_DURATION * FLIP_START_RATIO);
    wrappers.forEach((w, k) => {
      if (w) tl.to(w, { ...plan.targets[k], duration: SEPARATE_DURATION, ease: SEPARATE_EASE, overwrite: "auto" }, 0);
    });
    veils.forEach((v, k) => {
      if (v) tl.to(v, { opacity: plan.dim && k !== i ? OTHERS_VEIL : 0, duration: SEPARATE_DURATION, ease: SEPARATE_EASE, overwrite: "auto" }, 0);
    });
    if (prevFlipper) tl.to(prevFlipper, { rotationY: 0, duration: FLIP_DURATION, ease: FLIP_EASE, overwrite: "auto" }, 0);
    tl.to(
      flipper,
      { rotationY: 180, duration: FLIP_DURATION, ease: FLIP_EASE, overwrite: "auto" },
      SEPARATE_DURATION * FLIP_START_RATIO
    );
    deckTl.current = tl;
  });

  const closeDeck = contextSafe((i: number) => {
    deckTl.current?.kill();
    settledOpenRef.current = false;
    unflatten(i);
    const wrappers = cardRefs.wrapper.current;
    const veils = cardRefs.veil.current;
    const flipper = cardRefs.flipper.current[i];
    const home = { x: 0, y: 0, rotation: 0 };

    if (reducedRef.current) {
      const back = cardRefs.back.current[i];
      gsap.set(cardRefs.front.current[i], { visibility: "inherit" });
      gsap.to(back, { opacity: 0, duration: 0.4, onComplete: () => gsap.set(back, { visibility: "hidden" }) });
      gsap.to(cardRefs.front.current[i], {
        opacity: 1,
        duration: 0.4,
        onComplete: () => {
          wrappers.forEach((w) => w && gsap.set(w, home));
          veils.forEach((v) => v && gsap.set(v, { opacity: 0 }));
        },
      });
      return;
    }

    closingRef.current = i;
    const tl = gsap.timeline({ onComplete: () => restClosed(i) });
    tl.to(flipper, { rotationY: 0, duration: CLOSE_FLIP_DURATION, ease: FLIP_EASE, overwrite: "auto" }, 0);
    wrappers.forEach((w) => {
      if (w) tl.to(w, { ...home, duration: CLOSE_GROUP_DURATION, ease: SEPARATE_EASE, overwrite: "auto" }, CLOSE_GROUP_DELAY);
    });
    veils.forEach((v) => {
      if (v) tl.to(v, { opacity: 0, duration: CLOSE_GROUP_DURATION, ease: SEPARATE_EASE, overwrite: "auto" }, CLOSE_GROUP_DELAY);
    });
    deckTl.current = tl;
  });

  const close = useCallback(
    (restoreFocus: boolean) => {
      const i = openIndexRef.current;
      if (i == null) return;
      closeDeck(i);
      openIndexRef.current = null;
      setOpenIndex(null);
      if (restoreFocus) cardRefs.front.current[i]?.focus({ preventScroll: true });
    },
    [closeDeck, cardRefs]
  );

  const toggleCard = (i: number) => {
    if (layoutMode === "pending") return;
    if (openIndexRef.current === i) {
      close(true);
      return;
    }
    // Opening while another card is open is one combined motion: the old
    // card flips back while every card moves to the new configuration.
    openCard(i);
    openIndexRef.current = i;
    setOpenIndex(i);
  };

  const hoverCard = contextSafe((i: number, entering: boolean) => {
    if (openIndexRef.current != null || reducedRef.current) return;
    const wrapper = cardRefs.wrapper.current[i];
    if (!wrapper) return;
    gsap.to(wrapper, { y: entering ? HOVER_LIFT : 0, duration: 0.7, ease: "power3.out" });
  });

  // Escape and outside click close; scroll past the threshold closes too, but
  // only once the open motion has settled so the click's own Lenis settle
  // never counts.
  useEffect(() => {
    if (openIndex == null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onPointerDown = (e: PointerEvent) => {
      const onCard = cardRefs.wrapper.current.some((w) => w?.contains(e.target as Node));
      if (!onCard) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);

    // Baseline from the moment the card opens, so even a single jump counts.
    let last = lenis ? lenis.scroll : window.scrollY;
    let travelled = 0;
    const onScroll = () => {
      const y = lenis ? lenis.scroll : window.scrollY;
      if (!settledOpenRef.current) {
        last = y;
        return;
      }
      travelled += Math.abs(y - last);
      last = y;
      if (travelled > SCROLL_CLOSE_PX) close(false);
    };
    // Both sources: Lenis for wheel and touch it virtualises, the native
    // event for anything that moves the page some other way. Positions, not
    // deltas, are compared, so hearing the same move twice counts it once.
    if (lenis) lenis.on("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
      if (lenis) lenis.off("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [openIndex, lenis, close, cardRefs]);

  const cssVars = {
    "--hl": stackedMode ? "clamp(2.25rem, 9.5vw, 2.75rem)" : "clamp(2.1rem, 3.9vw, 3.6rem)",
    "--card-w": stackedMode ? "clamp(200px, 64vw, 260px)" : "clamp(200px, 20vw, 320px)",
    "--card-foot": stackedMode ? "52px" : "60px",
    "--back-lines": compact ? 6 : 8,
  } as React.CSSProperties;

  const fanStage = (
    <FanStage
      angles={FAN_ANGLES}
      refs={cardRefs}
      openIndex={openIndex}
      reducedMotion={prefersReducedMotion}
      onToggle={toggleCard}
      onHover={hoverCard}
      stageRef={stageRef}
    />
  );

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-cream text-midnight"
      style={cssVars}
      aria-label="Our Story"
    >
      <div className="flex flex-col px-section-x py-16 md:py-24">
        <span className="font-body-caps text-[10px] tracking-[0.30em] text-midnight/50">Our Story</span>

        {/* Composition: headline stack with the numbered rail, and the fan. */}
        <div
          ref={compositionRef}
          className={
            stackedMode
              ? "mt-10 flex flex-col"
              : "my-auto grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12"
          }
          style={{
            opacity: compositionShow ? 1 : 0,
            transition: "opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Headline stack */}
          <div ref={stackRef} className="relative">
            {/* Rail: base line + fill, measured to run point to point. */}
            <div
              ref={railRef}
              className="pointer-events-none absolute w-px"
              style={{ left: stackedMode ? "3px" : "calc(36px + 11.5px)" }}
              aria-hidden
            >
              <div className="absolute inset-0 bg-midnight/[0.18]" />
              <div ref={railFillRef} className="absolute inset-0 bg-midnight" />
            </div>

            <div className={stackedMode ? "flex flex-col gap-10" : "flex flex-col gap-6"}>
              {STORY_VALUES.map((value, i) => (
                <div
                  key={value.num}
                  className={
                    stackedMode
                      ? "grid grid-cols-[7px_minmax(0,1fr)] items-start gap-x-[22px]"
                      : "grid grid-cols-[36px_24px_minmax(0,1fr)] items-start"
                  }
                >
                  {stackedMode ? (
                    <div style={{ paddingTop: "3px" }}>
                      <Point pointRef={(el) => { pointRefs.current[i] = el; }} on />
                    </div>
                  ) : (
                    <>
                      <span
                        ref={(el) => { numeralRefs.current[i] = el; }}
                        className="font-body-caps text-[10px]"
                        style={{ paddingTop: "calc(var(--hl) * 0.40)", color: NUMERAL_ON }}
                      >
                        {value.num}
                      </span>
                      <div className="flex justify-center" style={{ paddingTop: "calc(var(--hl) * 0.42)" }}>
                        <Point pointRef={(el) => { pointRefs.current[i] = el; }} on />
                      </div>
                    </>
                  )}

                  <div className={stackedMode ? "flex flex-col gap-4" : "pl-7"}>
                    {stackedMode && (
                      <span
                        ref={(el) => { numeralRefs.current[i] = el; }}
                        className="font-body-caps text-[10px] text-midnight/50"
                      >
                        {value.num} / 04
                      </span>
                    )}
                    <h2
                      ref={(el) => { headlineRefs.current[i] = el; }}
                      className="font-headline leading-[1.0] text-midnight"
                      style={{ fontSize: "var(--hl)" }}
                    >
                      {value.headline === "STRAINED IN-HOUSE." ? (
                        <>
                          STRAINED <span className="whitespace-nowrap">IN-HOUSE.</span>
                        </>
                      ) : (
                        value.headline
                      )}
                    </h2>
                    {stackedMode && (
                      <p
                        ref={(el) => { bodyRefs.current[i] = el; }}
                        className="font-body-mixed text-[15px] leading-relaxed text-midnight/60"
                      >
                        {value.body}
                      </p>
                    )}
                    {stackedMode && (
                      <div className="mt-2">
                        <CardStage
                          index={i}
                          refs={cardRefs}
                          open={openIndex === i}
                          reducedMotion={prefersReducedMotion}
                          onToggle={toggleCard}
                          onHover={hoverCard}
                          stageRef={(el) => { cardStageRefs.current[i] = el; }}
                          hint={i === 0}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: subtitle for the current value, centred over the fan.
              One fixed-height slot, crossfaded, so the fan never moves. */}
          {!stackedMode && (
            <div className="flex flex-col" style={{ containerType: "inline-size" }}>
              {/* Always one line: the slot is the full column, and the size is
                  a fraction of the column width capped at 17px. The ratio is
                  measured against the longest body (560px at 17px, DM Sans)
                  with a small margin, so no viewport produces a second line. */}
              <div className="relative w-full text-center" style={{ minHeight: "1.7em", fontSize: `clamp(12px, ${SUBTITLE_CQW}cqw, 17px)` }}>
                {STORY_VALUES.map((value, i) => (
                  <p
                    key={value.num}
                    ref={(el) => { bodyRefs.current[i] = el; }}
                    className="absolute inset-x-0 top-0 whitespace-nowrap font-body-mixed leading-relaxed text-midnight/60"
                    style={{ opacity: i === COUNT - 1 ? 1 : 0 }}
                  >
                    {value.body}
                  </p>
                ))}
              </div>
              <div className="mt-8">{fanStage}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
