"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { CTAButton } from "@/components/ui/CTAButton";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { useCartStore } from "@/store/cartStore";
import { EMPTY_NUTRITION } from "@/lib/menu/nutrition";
import { formatPrice, getSignaturePrice } from "@/lib/menu/pricing";

// ─── Carousel data — ids must match PRICING.signatureBowls/Smoothies keys ─────

interface CarouselItem {
  id: string;
  name: string; // display + cart name; label renders uppercased
  src: string;
}

const BOWLS: CarouselItem[] = [
  { id: "moment", name: "The Moment", src: "/images-web/Transparent/Moment.png" },
  { id: "silk",   name: "The Silk",   src: "/images-web/Transparent/Silk.png" },
  { id: "crunch", name: "The Crunch", src: "/images-web/Transparent/Crunch.png" },
  { id: "tropic", name: "The Tropic", src: "/images-web/Transparent/Tropic.png" },
  { id: "bloom",  name: "The Bloom",  src: "/images-web/Transparent/Bloom.png" },
  { id: "bounty", name: "The Bounty", src: "/images-web/Transparent/Bounty.png" },
];

const SMOOTHIES: CarouselItem[] = [
  { id: "rise",     name: "The Rise",     src: "/images-web/Transparent/Rise.png" },
  { id: "crave",    name: "The Crave",    src: "/images-web/Transparent/Crave.png" },
  { id: "essence",  name: "The Essence",  src: "/images-web/Transparent/Essence.png" },
  { id: "recovery", name: "The Recovery", src: "/images-web/Transparent/Recovery.png" },
  { id: "cabana",   name: "The Cabana",   src: "/images-web/Transparent/Cabana.png" },
  { id: "nutty",    name: "The Nutty",    src: "/images-web/Transparent/Nutty.png" },
];

// Shared per-role widths so the positioned slot never resizes on swap
const BOWL_WIDTH = 400;
const SMOOTHIE_WIDTH = 360;

// ─── Pair CTA sizing — "Add Pair to Cart" and "Browse Our Full Menu" render at
// identical width/padding/font so they read as one button pair that differs
// only in colour scheme, not in size or shape ────────────────────────────────
const PAIR_CTA_WIDTH_DESKTOP = "clamp(150px, 23cqi, 260px)";
const PAIR_CTA_PADDING_DESKTOP = "clamp(0.5rem, 1.4cqi, 0.875rem) clamp(1rem, 2.7cqi, 2rem)";
const PAIR_CTA_FONT_SIZE_DESKTOP = "clamp(0.625rem, 1.35cqi, 0.75rem)";
const PAIR_CTA_PADDING_MOBILE = "clamp(0.55rem, 4cqw, 0.85rem) clamp(1rem, 5cqw, 1.5rem)";
const PAIR_CTA_FONT_SIZE_MOBILE = "clamp(0.5rem, 3.4cqw, 0.625rem)";
const PAIR_CTA_BORDER_WIDTH = "0.5px";
const PAIR_CTA_FONT_WEIGHT = 300;

// ─── Design-size coordinate system (880 wide). Rendered as % of stage. ────────
// Heights are sized so the stage box hugs the artwork (small symmetric inset,
// no large dead bands) — the visible gap above/below the stage is then owned
// by real margins/paddings in the section, not by empty box.

const DESIGN_W = 880;
const DESIGN_H = 624;
const DESIGN_H_DESKTOP = 480;

const DESKTOP_IMAGE_SCALE = 0.8;
// Mobile images no longer share horizontal space with the titles (which moved
// below the stage), so they can render a bit larger
const MOBILE_IMAGE_SCALE = 1.15;

// Labels share one left edge, right of the images, on desktop; their vertical
// center (and the decorative lines) is derived from the image centers at
// render time. On mobile the labels live below the stage instead, so the
// images are simply centered as a group — labelLeft is unused there.
const LAYOUTS = {
  mobile: {
    back:      { left: 128, top:  24, zIndex: 1 },
    front:     { left: 293, top: 144, zIndex: 2 },
    labelLeft: 508,
  },
  desktop: {
    back:      { left: 225, top:  24, zIndex: 1 },
    front:     { left: 335, top: 136, zIndex: 2 },
    labelLeft: 16,
  },
} as const;

function pctW(n: number) {
  return `${(n / DESIGN_W) * 100}%`;
}

function pctH(n: number, designH = DESIGN_H) {
  return `${(n / designH) * 100}%`;
}

function scaledWidth(width: number, scale: number) {
  return Math.round(width * scale);
}

function labelWrapperStyle(
  pos: { left: number; top: number },
  designH = DESIGN_H,
) {
  return {
    left: pctW(pos.left),
    top: pctH(pos.top, designH),
    // Center the title+arrows block on the image centerline so the decorative
    // line lands in the gap between title and arrows
    transform: "translateY(-50%)",
    zIndex: 3,
  };
}

// Wider on mobile than the old two-card layout since a single stage owns the row
const STAGE_CLASS =
  "pairing-stage relative shrink-0 max-w-full " +
  "w-[clamp(280px,92vw,880px)] " +
  "lg:w-[clamp(660px,86vw,1280px)]";

// Mobile-only: strips the leading "The " so titles fit a fixed-width column
// regardless of which item is selected (e.g. "The Recovery" -> "RECOVERY")
function dropLeadingThe(name: string) {
  return name.replace(/^The\s+/i, "");
}

// ─── Swap animation ───────────────────────────────────────────────────────────

type Direction = 1 | -1;

const SWAP_EASE = [0.16, 1, 0.3, 1] as const;
// Smooth, gently-settling ease-out for the scroll-entrance reveals — softer
// than the snappier SWAP_EASE (which the carousel swaps still use) so the
// title/images/labels glide in slowly and luxuriously instead of snapping.
const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;
// Desktop stage entrance — left/right columns converge inward first, then
// the center images fade in over the top of that motion (see PairingsSection).
const FLANK_TRAVEL = 20; // px — left/right column slide distance
const FLANK_ENTER_TRANSITION = { duration: 1.2, ease: REVEAL_EASE };
const IMAGE_ENTER_TRANSITION = { duration: 1.0, ease: REVEAL_EASE };
const SWAP_TRANSITION = { duration: 0.65, ease: SWAP_EASE };
const SWAP_TRANSITION_REDUCED = { duration: 0.15, ease: "easeOut" as const };
const LABEL_FADE = { duration: 0.2, ease: "easeInOut" as const };

// ─── Stage entrance variants ──────────────────────────────────────────────────
// One mount-stable trigger lives on the stage wrapper (initial="hidden" /
// whileInView="show"); every piece reveals via variant propagation from it, so
// the reveal never depends on the post-mount isDesktop flip. The two-beat feel
// (flank columns converge, then the center images fade a beat later) is baked
// into each variant's transition.delay instead of per-element scroll triggers.
const stageContainerDesktop: Variants = {
  hidden: {},
  show: {}, // wrapper box stays visible on desktop; children carry the motion
};
const stageContainerMobile: Variants = {
  hidden: { opacity: 0, x: "-6%" },
  show: { opacity: 1, x: 0, transition: { duration: 1.3, ease: REVEAL_EASE, delay: 0.1 } },
};
const flankLeftReveal: Variants = {
  hidden: { opacity: 0, x: -FLANK_TRAVEL },
  show: { opacity: 1, x: 0, transition: { ...FLANK_ENTER_TRANSITION, delay: 0.1 } },
};
const flankRightReveal: Variants = {
  hidden: { opacity: 0, x: FLANK_TRAVEL },
  show: { opacity: 1, x: 0, transition: { ...FLANK_ENTER_TRANSITION, delay: 0.1 } },
};
const imageReveal: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { ...IMAGE_ENTER_TRANSITION, delay: 0.45 } },
};

// Content travels in the direction of the clicked arrow: right arrow (d=1)
// slides the current item out to the right while the next enters from the left.
const imageVariants: Variants = {
  enter: (d: Direction) => ({ x: d === 1 ? "-20%" : "20%", opacity: 0, scale: 0.94 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (d: Direction) => ({ x: d === 1 ? "20%" : "-20%", opacity: 0, scale: 0.94 }),
};

const imageVariantsReduced: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

// ─── Section entrance — each piece reveals on its own scroll-into-view ────────
// Independent whileInView triggers (not one shared trigger on the whole,
// tall section) so each element animates when *it* is actually visible —
// title, then images, then the arrow controls/CTA, in natural scroll order.
const ENTER_VIEWPORT = { once: true, margin: "-100px" } as const;
// Fires later than ENTER_VIEWPORT — the reveal waits until the element is
// ~30% of the viewport up from the bottom, so the fade is actually seen
// mid-screen instead of flashing past at the very bottom edge.
const ENTER_VIEWPORT_DELAYED = { once: true, margin: "-30%" } as const;

// ─── Label sub-component ──────────────────────────────────────────────────────

function PairingLabel({ text, fontSize }: { text: string; fontSize?: string }) {
  return (
    <span
      className="heading-3 text-midnight whitespace-nowrap"
      // cqi keeps the title proportional to the stage; converges to heading-3's
      // 2.25rem cap on desktop
      style={{ fontSize: fontSize ?? "clamp(0.8rem, 2.2cqi + 0.15rem, 1.5rem)" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          className="inline-block whitespace-nowrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={LABEL_FADE}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// ─── Arrow button ─────────────────────────────────────────────────────────────

function ArrowButton({
  direction,
  onClick,
  disabled,
  label,
  size = "sm",
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
  label: string;
  size?: "sm" | "lg";
}) {
  const dims =
    size === "lg"
      ? { width: "48px", height: "48px" }
      : { width: "clamp(28px, 3.2cqi, 34px)", height: "clamp(28px, 3.2cqi, 34px)" };
  const iconSize = size === "lg" ? 18 : 14;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="
        flex items-center justify-center
        bg-grapefruit text-cream
        transition-opacity duration-200
        hover:opacity-60 disabled:opacity-35 disabled:cursor-default
      "
      style={dims}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {direction === "prev"
          ? <path d="M12.5 4.5 7 10l5.5 5.5" />
          : <path d="M7.5 4.5 13 10l-5.5 5.5" />}
      </svg>
    </button>
  );
}

// ─── Mobile controls — eyebrow + title + arrows, side by side below the stage ─

function MobileCarouselControls({
  role,
  name,
  onPrev,
  onNext,
  locked,
}: {
  role: "bowl" | "smoothie";
  name: string;
  onPrev: () => void;
  onNext: () => void;
  locked: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      {/* Static eyebrow — the item name itself replaces "The", so this column's
          width never changes based on which item is selected */}
      <span className="font-body-caps text-midnight/50 text-[9px] tracking-[0.25em]">
        THE
      </span>
      <PairingLabel
        text={dropLeadingThe(name).toUpperCase()}
        fontSize="clamp(0.95rem, 4.8vw, 1.4rem)"
      />
      <div className="flex items-center gap-4 mt-1.5">
        <ArrowButton direction="prev" onClick={onPrev} disabled={locked} label={`Previous ${role}`} size="lg" />
        <ArrowButton direction="next" onClick={onNext} disabled={locked} label={`Next ${role}`} size="lg" />
      </div>
    </div>
  );
}

// ─── ItemCarousel — one infinite carousel (image + label + arrows) ────────────

function ItemCarousel({
  role,
  items,
  index,
  direction,
  locked,
  onPrev,
  onNext,
  onSwapComplete,
  imgPos,
  labelPos,
  width,
  designH,
  isDesktop,
  showLabel,
  prefersReducedMotion,
}: {
  role: "bowl" | "smoothie";
  items: CarouselItem[];
  index: number;
  direction: Direction;
  locked: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSwapComplete: () => void;
  imgPos: { left: number; top: number; zIndex: number };
  labelPos: { left: number; top: number };
  width: number;
  designH: number;
  isDesktop: boolean;
  showLabel: boolean;
  prefersReducedMotion: boolean;
}) {
  const item = items[index];
  const neighbors = [
    items[(index - 1 + items.length) % items.length],
    items[(index + 1) % items.length],
  ];
  const sizes = isDesktop
    ? "(min-width: 1024px) 60vw, 1140px"
    : "(max-width: 1023px) 80vw, 880px";
  const imageScale = isDesktop ? DESKTOP_IMAGE_SCALE : MOBILE_IMAGE_SCALE;

  return (
    <>
      {/* Image slot — fixed position/size; children stack absolutely so both
          the outgoing and incoming item are visible mid-swap. On desktop this
          owns its own scroll-entrance fade (beat 2 of the stage choreography);
          on mobile it stays inert and the STAGE_CLASS wrapper's own animation
          is what carries the entrance. */}
      <motion.div
        className="absolute"
        style={{
          left: pctW(imgPos.left),
          top: pctH(imgPos.top, designH),
          width: pctW(scaledWidth(width, imageScale)),
          zIndex: imgPos.zIndex,
        }}
        // Desktop: fades in (beat 2) via the stage wrapper's variant trigger.
        // Mobile: no variants → inert; rides the wrapper's own slide/fade.
        variants={isDesktop ? imageReveal : undefined}
      >
        <AnimatePresence initial={false} custom={direction} onExitComplete={onSwapComplete}>
          <motion.div
            key={item.id}
            custom={direction}
            variants={prefersReducedMotion ? imageVariantsReduced : imageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReducedMotion ? SWAP_TRANSITION_REDUCED : SWAP_TRANSITION}
            style={{ position: "absolute", top: 0, left: 0, width: "100%" }}
          >
            <Image
              src={item.src}
              alt={`${item.name} ${role}`}
              width={1080}
              height={1080}
              sizes={sizes}
              style={{ width: "100%", height: "auto" }}
              priority
            />
          </motion.div>
        </AnimatePresence>

        {/* Rolling neighbor preload — eager (not display:none) so the incoming
            image is already fetched before an arrow is clicked */}
        {neighbors.map((n) => (
          <Image
            key={n.id}
            src={n.src}
            alt=""
            aria-hidden
            width={1080}
            height={1080}
            sizes={sizes}
            loading="eager"
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        ))}
      </motion.div>

      {/* Title + arrows, left-aligned in one container — desktop only; on
          mobile the title/arrows render below the stage instead. This is
          the "left column" of the stage choreography — slides in from the
          left in lockstep with the same block on the other ItemCarousel. */}
      {showLabel && (
        // Anchoring (static translateY centering on the hairline) lives on this
        // plain div; the inner motion.div only carries the reveal. Framer owns
        // the transform on animated elements, so a static translateY on the
        // motion.div itself would be discarded and the block would sag below
        // its line. Variant propagation passes through plain elements.
        <div className="absolute" style={labelWrapperStyle(labelPos, designH)}>
          <motion.div className="flex flex-col items-start" variants={flankLeftReveal}>
            <PairingLabel text={item.name.toUpperCase()} />
            <div className="flex items-center" style={{ marginTop: "max(10px, 1.4cqi)", gap: "max(6px, 0.8cqi)" }}>
              <ArrowButton direction="prev" onClick={onPrev} disabled={locked} label={`Previous ${role}`} />
              <ArrowButton direction="next" onClick={onNext} disabled={locked} label={`Next ${role}`} />
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

// ─── PairingsSection ──────────────────────────────────────────────────────────

const CORNERS_MQ = "(min-width: 1024px)";

export function PairingsSection() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"column" | "corners">("column");

  const [bowlIndex, setBowlIndex] = useState(0);
  const [bowlDirection, setBowlDirection] = useState<Direction>(1);
  const [bowlLocked, setBowlLocked] = useState(false);

  const [smoothieIndex, setSmoothieIndex] = useState(0);
  const [smoothieDirection, setSmoothieDirection] = useState<Direction>(1);
  const [smoothieLocked, setSmoothieLocked] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);
  const addedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cornersMq = window.matchMedia(CORNERS_MQ);

    const syncMotion = () => setPrefersReducedMotion(motionMq.matches);
    const syncLayout = () => {
      setLayoutMode(cornersMq.matches ? "corners" : "column");
      // The layout flip remounts the stage subtree (see the keyed wrapper),
      // which destroys any in-flight AnimatePresence exit, so onExitComplete
      // never fires and the locks would stay stuck on
      setBowlLocked(false);
      setSmoothieLocked(false);
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

  useEffect(() => {
    return () => {
      if (addedTimeout.current) clearTimeout(addedTimeout.current);
    };
  }, []);

  const stepBowl = (dir: Direction) => {
    if (bowlLocked) return;
    setBowlDirection(dir);
    setBowlLocked(true);
    setBowlIndex((i) => (i + dir + BOWLS.length) % BOWLS.length);
  };

  const stepSmoothie = (dir: Direction) => {
    if (smoothieLocked) return;
    setSmoothieDirection(dir);
    setSmoothieLocked(true);
    setSmoothieIndex((i) => (i + dir + SMOOTHIES.length) % SMOOTHIES.length);
  };

  const bowl = BOWLS[bowlIndex];
  const smoothie = SMOOTHIES[smoothieIndex];
  const pairPrice = getSignaturePrice(bowl.id) + getSignaturePrice(smoothie.id);

  const handleAddPair = () => {
    addItem({
      kind: "signature",
      productId: bowl.id,
      name: bowl.name,
      nutrition: { ...EMPTY_NUTRITION },
      quantity: 1,
      unitPrice: getSignaturePrice(bowl.id),
    });
    addItem({
      kind: "signature",
      productId: smoothie.id,
      name: smoothie.name,
      nutrition: { ...EMPTY_NUTRITION },
      quantity: 1,
      unitPrice: getSignaturePrice(smoothie.id),
    });
    setAdded(true);
    if (addedTimeout.current) clearTimeout(addedTimeout.current);
    addedTimeout.current = setTimeout(() => setAdded(false), 1400);
  };

  const isDesktop = layoutMode === "corners";
  const pos = LAYOUTS[isDesktop ? "desktop" : "mobile"];
  const designH = isDesktop ? DESIGN_H_DESKTOP : DESIGN_H;

  const imageScale = isDesktop ? DESKTOP_IMAGE_SCALE : MOBILE_IMAGE_SCALE;

  // PNGs are square, so rendered height = width in design units
  const smoothieCenterY = pos.back.top + scaledWidth(SMOOTHIE_WIDTH, imageScale) / 2;
  const bowlCenterY = pos.front.top + scaledWidth(BOWL_WIDTH, imageScale) / 2;

  // Desktop labels center on the image centerline (the decorative line lands
  // in the gap between title and arrows); mobile renders its labels below the
  // stage instead, so these values are unused there
  const smoothieLabelTop = smoothieCenterY;
  const bowlLabelTop = bowlCenterY;

  return (
    <section className="relative w-full bg-cream overflow-x-clip pt-16 lg:pt-24 pb-16 lg:pb-4 px-section-x">
      <div className="mx-auto flex w-full max-w-[min(100%,90rem)] flex-col gap-4 lg:gap-5">
        <div className="flex flex-col">
          <motion.div
            // Remount when the reduced-motion flag resolves post-hydration so
            // initial={false} actually applies (initial is mount-time only)
            key={`heading-${prefersReducedMotion}`}
            className="flex flex-col items-center"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={ENTER_VIEWPORT_DELAYED}
            transition={{ duration: 1.2, ease: REVEAL_EASE }}
          >
            <span className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em] mb-2 lg:mb-3">
              Featured
            </span>
            <h2
              className="
                text-center
                font-headline text-midnight tracking-headline leading-tight
                text-[clamp(2.25rem,7vw,4.75rem)]
              "
            >
              PAIR YOUR FAVOURITES
            </h2>
          </motion.div>

          <div className="flex justify-center mt-4 lg:mt-6">
            <motion.div
              // Remount the whole stage subtree when the layout mode (or the
              // reduced-motion flag) resolves post-hydration. initial/variants
              // are only resolved at mount, so without the remount a desktop
              // viewport keeps the mobile hidden values (opacity 0, x -6%)
              // stamped at first render and "show" ({} on desktop) never
              // clears them, leaving the stage permanently invisible.
              key={`${layoutMode}-${prefersReducedMotion}`}
              className={STAGE_CLASS}
              style={{
                aspectRatio: `${DESIGN_W} / ${designH}`,
                containerType: "inline-size",
              }}
              // Single entrance trigger for the whole stage. Mobile: the
              // container variant slides the whole stage in as one unit.
              // Desktop: the container box stays put and each child (left
              // column, images, right column) reveals via its own variant,
              // propagated from here.
              variants={isDesktop ? stageContainerDesktop : stageContainerMobile}
              initial={prefersReducedMotion ? false : "hidden"}
              whileInView="show"
              viewport={ENTER_VIEWPORT_DELAYED}
            >
              {/* Decorative full-bleed hairlines through each image's vertical
                  center — behind the artwork (images sit at zIndex 1/2), and the
                  section's overflow-x-clip contains the 100vw bleed. On desktop
                  these fade in with the image beat; on mobile they ride the
                  wrapper's own animation above. */}
              {[smoothieCenterY, bowlCenterY].map((centerY) => (
                <motion.div
                  key={centerY}
                  // Desktop: fades in with the image beat via variant propagation.
                  // Mobile: inert; rides the wrapper's own slide/fade.
                  variants={isDesktop ? imageReveal : undefined}
                  aria-hidden
                  className="absolute bg-midnight/15 pointer-events-none"
                  style={{
                    top: pctH(centerY, designH),
                    left: "50%",
                    width: "100vw",
                    transform: "translateX(-50%)",
                    height: 1,
                    zIndex: 0,
                  }}
                />
              ))}
              <ItemCarousel
                role="smoothie"
                items={SMOOTHIES}
                index={smoothieIndex}
                direction={smoothieDirection}
                locked={smoothieLocked}
                onPrev={() => stepSmoothie(-1)}
                onNext={() => stepSmoothie(1)}
                onSwapComplete={() => setSmoothieLocked(false)}
                imgPos={pos.back}
                labelPos={{ left: pos.labelLeft, top: smoothieLabelTop }}
                width={SMOOTHIE_WIDTH}
                designH={designH}
                isDesktop={isDesktop}
                showLabel={isDesktop}
                prefersReducedMotion={prefersReducedMotion}
              />
              <ItemCarousel
                role="bowl"
                items={BOWLS}
                index={bowlIndex}
                direction={bowlDirection}
                locked={bowlLocked}
                onPrev={() => stepBowl(-1)}
                onNext={() => stepBowl(1)}
                onSwapComplete={() => setBowlLocked(false)}
                imgPos={pos.front}
                labelPos={{ left: pos.labelLeft, top: bowlLabelTop }}
                width={BOWL_WIDTH}
                designH={designH}
                isDesktop={isDesktop}
                showLabel={isDesktop}
                prefersReducedMotion={prefersReducedMotion}
              />

              {/* Desktop-only right column — anchored to the same two hairlines
                  the left labels hang off. Pair Total rests just above the top
                  line; the two CTAs sit centered in the gap between the lines.
                  On mobile these render in normal flow below the stage instead.
                  Mirrors the left column's entrance (slides in from the right,
                  same timing) so both read as one converging "beat 1". */}
              {isDesktop && (
                <>
                  {/* Static anchoring transform on a plain wrapper, reveal on
                      the inner motion.div — see the left-label comment */}
                  <div
                    className="absolute"
                    style={{
                      right: 0,
                      top: pctH(smoothieCenterY, designH),
                      transform: "translateY(calc(-100% - 6px))",
                      zIndex: 3,
                    }}
                  >
                  <motion.div
                    className="flex flex-col items-end gap-1"
                    variants={flankRightReveal}
                  >
                    <span className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]">
                      Pair Total
                    </span>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={`${bowlIndex}-${smoothieIndex}`}
                        className="font-headline text-midnight tracking-headline"
                        style={{ fontSize: "clamp(1rem, 2.6cqi, 1.5rem)" }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={LABEL_FADE}
                      >
                        {formatPrice(pairPrice)}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                  </div>

                  <div
                    className="absolute"
                    style={{
                      right: 0,
                      top: pctH((smoothieCenterY + bowlCenterY) / 2, designH),
                      transform: "translateY(-50%)",
                      zIndex: 3,
                    }}
                  >
                  <motion.div
                    className="flex flex-col items-end gap-4"
                    variants={flankRightReveal}
                  >
                    <div style={{ width: PAIR_CTA_WIDTH_DESKTOP }}>
                      <AddToCartButton
                        label="Add Pair to Cart"
                        addedLabel="Pair Added"
                        added={added}
                        onClick={handleAddPair}
                        style={{ padding: PAIR_CTA_PADDING_DESKTOP, fontSize: PAIR_CTA_FONT_SIZE_DESKTOP }}
                      />
                    </div>
                    <div style={{ width: PAIR_CTA_WIDTH_DESKTOP }}>
                      <CTAButton
                        href="/order"
                        variant="dark"
                        className="w-full"
                        style={{ padding: PAIR_CTA_PADDING_DESKTOP, borderWidth: PAIR_CTA_BORDER_WIDTH }}
                        textStyle={{ fontSize: PAIR_CTA_FONT_SIZE_DESKTOP, fontWeight: PAIR_CTA_FONT_WEIGHT }}
                      >
                        Browse Our Menu
                      </CTAButton>
                    </div>
                  </motion.div>
                  </div>
                </>
              )}
            </motion.div>
          </div>

          {/* Mobile-only: title + arrows move below the stage, side by side.
              Fixed equal-width grid columns (not flex+gap) so neither block
              ever shifts or overlaps the other as item names change length. */}
          <motion.div
            // Remount when the reduced-motion flag resolves (see heading block)
            key={`mobile-controls-${prefersReducedMotion}`}
            className="mx-auto grid grid-cols-2 w-[clamp(280px,92vw,520px)] lg:hidden mt-3"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={ENTER_VIEWPORT_DELAYED}
            transition={{ duration: 1.1, ease: REVEAL_EASE, delay: prefersReducedMotion ? 0 : 0.1 }}
          >
            <MobileCarouselControls
              role="smoothie"
              name={smoothie.name}
              onPrev={() => stepSmoothie(-1)}
              onNext={() => stepSmoothie(1)}
              locked={smoothieLocked}
            />
            <MobileCarouselControls
              role="bowl"
              name={bowl.name}
              onPrev={() => stepBowl(-1)}
              onNext={() => stepBowl(1)}
              locked={bowlLocked}
            />
          </motion.div>
        </div>

        {/* Mobile-only: Pair Total + CTAs centered below the stage. On desktop
            these live inside the stage, anchored to the hairlines (see above). */}
        <motion.div
          // Remount when the reduced-motion flag resolves (see heading block)
          key={`mobile-cta-${prefersReducedMotion}`}
          className="flex flex-col items-center gap-4 lg:hidden"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={ENTER_VIEWPORT}
          transition={{ duration: 1.1, ease: REVEAL_EASE, delay: prefersReducedMotion ? 0 : 0.1 }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]">
              Pair Total
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${bowlIndex}-${smoothieIndex}`}
                className="font-headline text-midnight tracking-headline text-xl lg:text-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={LABEL_FADE}
              >
                {formatPrice(pairPrice)}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="w-56 sm:w-60">
            <AddToCartButton
              label="Add Pair to Cart"
              addedLabel="Pair Added"
              added={added}
              onClick={handleAddPair}
              style={{ padding: PAIR_CTA_PADDING_MOBILE, fontSize: PAIR_CTA_FONT_SIZE_MOBILE }}
            />
          </div>

          <div className="w-56 sm:w-60">
            <CTAButton
              href="/order"
              variant="dark"
              className="w-full"
              style={{ padding: PAIR_CTA_PADDING_MOBILE, borderWidth: PAIR_CTA_BORDER_WIDTH }}
              textStyle={{ fontSize: PAIR_CTA_FONT_SIZE_MOBILE, fontWeight: PAIR_CTA_FONT_WEIGHT }}
            >
              Browse Our Full Menu
            </CTAButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
