"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { STACK_SIZE, resolveEnhancerGroups } from "@/lib/menu/featuredEnhancers";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { useRevealReady } from "@/lib/useRevealReady";

gsap.registerPlugin(ScrollTrigger);

// ─── Rings ────────────────────────────────────────────────────────────────────
// One ring per pick in the enhancers bundle, closing as the section passes
// through the viewport. Not a goal ring: closing means the stack is complete,
// never that a daily requirement has been met.
//
// From lg up the ring owns the right half of the section, vertically centred,
// bleeding off the right edge (contained by the section's overflow-x-clip),
// and sized off viewport width so it cannot grow into the type column on its
// left. Width only, like everything else here.
//
// Below lg there is no right half to own: the type runs the full width, and a
// ring behind it either sits on top of the names or shrinks to a token. So it
// comes out of absolute positioning and back into the flow, between the
// headline and the block of names, where it reads as the divider between them.
// It is sized off viewport width there too, so a phone renders the same ring
// whichever way it is turned.
const RING_BOX = 480;
const RING_RADII = [220, 172, 124];
const RING_STROKE = 34;
const RING_COLORS = ["var(--color-grapefruit)", "var(--color-cream)", "var(--color-blue)"];
const RING_TRACK = "rgba(255, 247, 240, 0.07)";

// ─── Type scale ───────────────────────────────────────────────────────────────
// Width only. Nothing in this section responds to viewport height: at a given
// width the section renders identically on any screen, tall or short, and a
// screen too short to hold it scrolls. Height-relative type is what made this
// section behave differently from the rest of the site, and it bought nothing
// a scroll does not already give.
const TYPE_SCALE = {
  "--stack-eyebrow": "clamp(0.625rem, 1.1vw, 0.6875rem)",
  "--stack-headline": "clamp(2.25rem, 4.6vw, 4rem)",
  "--stack-payoff": "clamp(1.125rem, 1.9vw, 1.25rem)",
  "--stack-group": "0.6875rem",
  "--stack-name": "clamp(0.8125rem, 1vw, 0.875rem)",
  "--stack-stat": "clamp(0.6875rem, 0.85vw, 0.75rem)",
} as React.CSSProperties;

// Scrub, not a pin. Pinning is what made Our Story fragile, and this needs none.
const SCRUB_START = "top 78%";
const SCRUB_END = "center 52%";
const SCRUB_LAG = 1; // seconds of catch-up; smooths trackpad spikes

const circumference = (r: number) => 2 * Math.PI * r;

// Entrance timings. House motion: quint-out, ~1.1-1.3s, short travel, soft
// fade, staggered by visual hierarchy (the tagline leads, the columns follow).
const EASE = "power4.out";
// The headline carries slightly more travel than the supporting copy so it
// still leads the cascade now that it fades rather than wipes.
const LINE_TRAVEL = 20;

// Two lines by preference. Each line wraps on its own only when the viewport
// leaves it no room, so the break lands where it was designed to land instead
// of wherever the text happens to run out.
const TAGLINE_LINES = ["Food That Moves", "With You"];

export function StacksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const payoffRef = useRef<HTMLParagraphElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ringRefs = useRef<(SVGCircleElement | null)[]>([]);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Watches the type column, NOT the section. The section carries ~176px of
  // top padding, so a section-level observer fired while the tagline was still
  // a screen-height below the fold and the whole reveal played to nobody. The
  // column starts at the eyebrow, and the negative margin holds the reveal
  // until it is properly on screen.
  const show = useRevealReady(typeRef, "-12%");

  const groups = resolveEnhancerGroups();

  // ── Entrance: eyebrow, tagline line by line, payoff, then the columns ─────
  useGSAP(
    () => {
      const lines = lineRefs.current.filter(Boolean) as HTMLSpanElement[];
      const columns = columnRefs.current.filter(Boolean) as HTMLDivElement[];
      const targets = [eyebrowRef.current, ...lines, payoffRef.current, ...columns].filter(
        Boolean
      ) as HTMLElement[];

      if (prefersReducedMotion) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      // Rendered markup is the end state; the start state is set here so the
      // section is never blank for a reader with JavaScript disabled.
      gsap.set([eyebrowRef.current, payoffRef.current, ...columns], { opacity: 0, y: 16 });
      gsap.set(lines, { opacity: 0, y: LINE_TRAVEL });

      if (!show) return;

      const tl = gsap.timeline({
        onComplete: () => {
          // Release the compositor layers once the section has settled; the
          // ring below keeps scrubbing for the rest of the scroll.
          gsap.set(targets, { willChange: "auto" });
        },
      });
      tl.to(eyebrowRef.current, { opacity: 1, y: 0, duration: 1.1, ease: EASE }, 0);
      // Line by line, largest element first. Transform and opacity only: the
      // clip-path wipe this replaced was restyled from JavaScript on every
      // frame, which repaints the whole headline each time, and on the same
      // main thread the ring scrub and Lenis are already using it dropped to
      // a few frames a second and read as words popping in one at a time.
      tl.to(lines, { opacity: 1, y: 0, duration: 1.25, ease: EASE, stagger: 0.16 }, 0.12);
      tl.to(payoffRef.current, { opacity: 1, y: 0, duration: 1.15, ease: EASE }, 0.6);
      // Columns left to right, which is also reading order.
      tl.to(columns, { opacity: 1, y: 0, duration: 1.15, ease: EASE, stagger: 0.14 }, 0.78);
    },
    { scope: sectionRef, dependencies: [show, prefersReducedMotion] }
  );

  // ── Rings: closed by scroll position, not by elapsed time ────────────────
  useGSAP(
    () => {
      const rings = ringRefs.current.filter(Boolean) as SVGCircleElement[];
      if (rings.length === 0) return;

      if (prefersReducedMotion) {
        gsap.set(rings, { strokeDashoffset: 0 });
        return;
      }

      rings.forEach((ring, i) => {
        const c = circumference(RING_RADII[i] ?? RING_RADII[0]);
        gsap.set(ring, { strokeDasharray: c, strokeDashoffset: c });
      });

      // One unit of timeline per ring. Scrub makes real time irrelevant; the
      // ratios between tweens are what set the feel, and scrolling back up
      // reopens them.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: SCRUB_START,
          end: SCRUB_END,
          scrub: SCRUB_LAG,
          invalidateOnRefresh: true,
        },
      });

      rings.forEach((ring, i) => {
        tl.to(ring, { strokeDashoffset: 0, duration: 1 }, i * 0.35);
      });
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] }
  );

  return (
    <section
      ref={sectionRef}
      // Height comes from the contents and the padding, never from the
      // viewport. A window too short to hold the section scrolls, which is the
      // same deal every other section on the page offers.
      className="relative flex w-full flex-col overflow-x-clip bg-midnight px-section-x py-[clamp(4rem,9vw,8rem)]"
      style={TYPE_SCALE}
      aria-label="Enhancers"
    >
      {/* Everything else keeps to the left so the ring owns the right half.
          Below lg the ring is not beside this block but under it, so this is
          simply the top of the column. */}
      <div ref={typeRef} className="relative w-full lg:max-w-[54%]">
        <p
          ref={eyebrowRef}
          className="font-body-caps text-[length:var(--stack-eyebrow)] tracking-[0.30em] text-cream/50"
          style={{ willChange: "transform, opacity" }}
        >
          Enhancers
        </p>

        <h2 className="font-headline mt-4 uppercase leading-none tracking-headline text-cream lg:mt-5">
          {TAGLINE_LINES.map((line, i) => (
            // No overflow-hidden and no clip: a mask tight enough to hide the
            // line before it slides would shave the serif's ascenders at
            // leading-none, which is what the old padding hack was working
            // around. Fading each line in place needs neither.
            <span key={line} className="block">
              <span
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                className="block text-[length:var(--stack-headline)]"
                style={{ willChange: "transform, opacity" }}
              >
                {i === TAGLINE_LINES.length - 1 ? (
                  <>
                    With <span className="text-grapefruit">You</span>
                  </>
                ) : (
                  line
                )}
              </span>
            </span>
          ))}
        </h2>

        {/* No width cap: one line wherever the column allows it, wrapping only
            when it genuinely cannot. */}
        <p
          ref={payoffRef}
          className="font-body-mixed mt-5 text-[length:var(--stack-payoff)] leading-snug text-cream/80 lg:mt-6"
          style={{ willChange: "transform, opacity" }}
        >
          Stack with {STACK_SIZE} enhancers. Get more for less.
        </p>
      </div>

      {/* In the flow between the headline and the names below lg; the right
          half of the composition from lg up. */}
      <div
        aria-hidden
        // The lg branch (1024-1279, tablet landscape) stays where it was: 44vw
        // hung 6% off the right edge puts its left edge at 62% of the viewport,
        // clear of the 54% type column with ~60px to spare, and there is not
        // much more room than that at 1024.
        //
        // Desktop gets a bigger ring by growing the box and pushing more of it
        // off the edge at the same time, which scales the arc without walking
        // the left edge any closer to the type: 56vw hung 15% off the right
        // lands that edge at 59% of the viewport. The 900px cap is the section
        // height, roughly 1015-1050px across desktop widths, minus room to
        // breathe. The section only clips horizontally, so a ring taller than
        // that would spill into Build above and Our Story below.
        className="pointer-events-none relative mx-auto mt-9 aspect-square w-[clamp(150px,62vw,260px)] shrink-0 sm:mt-10 sm:w-[clamp(180px,52vw,320px)] lg:absolute lg:-right-[6%] lg:top-1/2 lg:mx-0 lg:mt-0 lg:w-[clamp(360px,44vw,640px)] lg:-translate-y-1/2 xl:-right-[15%] xl:w-[clamp(560px,56vw,900px)]"
        // strokeDashoffset is a paint property, not a composited one, so the
        // scrub repaints this ring on every scroll frame. Its own layer keeps
        // that repaint off the headline's, which is what the entrance is
        // competing with.
        style={{ willChange: "transform" }}
      >
        <svg viewBox={`0 0 ${RING_BOX} ${RING_BOX}`} className="block h-full w-full">
          <g>
            {RING_RADII.map((r) => (
              <circle
                key={`track-${r}`}
                cx={RING_BOX / 2}
                cy={RING_BOX / 2}
                r={r}
                fill="none"
                stroke={RING_TRACK}
                strokeWidth={RING_STROKE}
              />
            ))}
          </g>
          <g transform={`rotate(-90 ${RING_BOX / 2} ${RING_BOX / 2})`}>
            {RING_RADII.slice(0, STACK_SIZE).map((r, i) => (
              <circle
                key={`ring-${r}`}
                ref={(el) => {
                  ringRefs.current[i] = el;
                }}
                cx={RING_BOX / 2}
                cy={RING_BOX / 2}
                r={r}
                fill="none"
                stroke={RING_COLORS[i]}
                strokeWidth={RING_STROKE}
                strokeLinecap="butt"
              />
            ))}
          </g>
        </svg>
      </div>

      {/* The whole shelf: four groups, two by two. Every name is its own link;
          `?add=` is read by components/build/PrefillNotice.tsx. */}
      <div className="mt-9 grid w-full grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:mt-14 lg:max-w-[54%] lg:gap-x-12 lg:gap-y-12">
        {groups.map((group, i) => (
          <div
            key={group.id}
            // min-w-0 so a long ingredient name wraps inside its column
            // instead of widening the grid track and pushing the stat off.
            className="min-w-0"
            ref={(el) => {
              columnRefs.current[i] = el;
            }}
            style={{ willChange: "transform, opacity" }}
          >
            <h3 className="font-body-caps text-[length:var(--stack-group)] tracking-[0.26em] text-cream">
              {group.title}
            </h3>

            <ul className="mt-4 list-none p-0 lg:mt-5">
              {group.items.map((item) => (
                <li key={item.ingredientId} className="border-t border-cream/[0.14]">
                  <TransitionLink
                    href={`/build?add=${item.ingredientId}`}
                    // 44px minimum on touch; from lg up the pointer is
                    // precise and the row can sit tighter.
                    className="group flex min-h-[2.75rem] items-baseline justify-between gap-3 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream lg:min-h-0 lg:py-3"
                  >
                    <span className="font-body-mixed min-w-0 text-[length:var(--stack-name)] leading-snug text-cream transition-opacity duration-200 group-hover:opacity-70">
                      {item.ingredient.name}
                    </span>
                    <span className="font-body-mixed shrink-0 text-[length:var(--stack-stat)] tabular-nums text-grapefruit">
                      {item.statLine}
                    </span>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
