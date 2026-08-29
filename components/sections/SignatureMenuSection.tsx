"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CTAButton } from "@/components/ui/CTAButton";
import { SignatureTile } from "@/components/ui/SignatureTile";
import { useRevealReady } from "@/lib/useRevealReady";
import { useAddedBeat } from "@/lib/useAddedBeat";
import { useCartStore } from "@/store/cartStore";
import { addSignatureDirect, needsConfiguration } from "@/lib/menu/signatureAdd";
import { formatSizeStat, getSizeTiers, listBowls, listSmoothies, type SignatureCategory, type SignatureItem } from "@/lib/menu/signatures";

// ─── Data ─────────────────────────────────────────────────────────────────────
// Read from lib/menu/menu.json (via signatures.ts): the same file the in-store
// Menu TV renders from, so this section and the board never drift.

const BOWLS = listBowls();
const SMOOTHIES = listSmoothies();
const ALL_ITEMS = [...BOWLS, ...SMOOTHIES];

// "Medium $12 · Large $15" / "24 oz $15". Tier prices are flat per category,
// so the first item's prices stand in for the group.
function priceNote(category: SignatureCategory): string {
  const sample = category === "bowl" ? BOWLS[0] : SMOOTHIES[0];
  return getSizeTiers(category)
    .filter((tier) => sample.sizes[tier.id] !== undefined)
    .map((tier) => `${tier.label} $${sample.sizes[tier.id].price}`)
    .join(" · ");
}

// ─── Motion ───────────────────────────────────────────────────────────────────
// House entrance curve; rows cascade in visual order, hairlines draw left to
// right. Item swaps on the stage are interactive feedback, so they use the
// snappier curve the Pairings carousel uses. Every reveal waits on its own
// on-screen images having decoded (useRevealReady), never on scroll position
// alone. The row thumbnails are display:none above lg and are excluded there.

const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;
const SWAP_EASE = [0.16, 1, 0.3, 1] as const;
const ENTER_MARGIN = "-100px";
const NAV_HEIGHT_PX = 72; // matches Navbar.tsx / HeroSection.tsx
const HAIRLINE = "0.5px solid rgba(41,45,42,0.15)";
const ROW_TINT = "rgba(41,45,42,0.05)";

function makeVariants(reduced: boolean) {
  const d = (seconds: number) => (reduced ? 0 : seconds);
  const header: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: d(0.14), delayChildren: d(0.05) } },
  };
  const rise: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: d(1.1), ease: REVEAL_EASE } },
  };
  const group: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: d(0.12) } },
  };
  const row: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: d(1.0), ease: REVEAL_EASE } },
  };
  const hairline: Variants = {
    hidden: { scaleX: 0 },
    show: { scaleX: 1, transition: { duration: d(1.3), ease: REVEAL_EASE } },
  };
  return { header, rise, group, row, hairline };
}

type MenuVariants = ReturnType<typeof makeVariants>;

// ─── Add button (icon) ───────────────────────────────────────────────────────
// Feedback after a successful add: the box inverts (white with a grapefruit
// check) for the length of the Added beat, then returns to the orange "+".
// A bowl's "+" opens the add modal (size and yogurt are required there); a
// smoothie's "+" adds outright. Either way the beat lands on this button.

function AddIconButton({
  name,
  added,
  onClick,
  className = "",
}: {
  name: string;
  added: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={added ? `${name} added to cart` : `Add ${name} to cart`}
      data-added={added ? "true" : undefined}
      className={`
        h-8 w-8 items-center justify-center
        border border-grapefruit
        transition-[background-color,color,border-color] duration-300
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grapefruit
        ${added ? "bg-[#fff] text-grapefruit cursor-default" : "bg-grapefruit text-[#fff] hover:bg-grapefruit/75"}
        ${className}
      `}
    >
      {added ? (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9 3h2v6h6v2h-6v6H9v-6H3V9h6V3Z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MenuRow({
  item,
  index,
  active,
  onActivate,
  variants,
}: {
  item: SignatureItem;
  index: number;
  active: boolean;
  onActivate: () => void;
  variants: MenuVariants;
}) {
  const calories = formatSizeStat(item, "calories");
  const protein = formatSizeStat(item, "protein");
  const addItem = useCartStore((s) => s.addItem);
  const openAdd = useCartStore((s) => s.openAdd);
  const { added, flash } = useAddedBeat(item.id);

  const handleAdd = () => {
    // A second press during the beat is almost always a double-tap, not a
    // request for two. Quantity lives in the cart.
    if (added) return;
    // Bowls need a size and a yogurt, chosen in the modal, the way the store
    // takes the order. Smoothies have one size and come with vanilla.
    if (needsConfiguration(item)) {
      openAdd(item.id);
      return;
    }
    if (addSignatureDirect(item, addItem) === "added") flash();
  };

  return (
    <motion.li variants={variants.row}>
      <div
        onMouseEnter={onActivate}
        onFocus={onActivate}
        className="
          group relative w-full text-left
          grid grid-cols-[4rem_1fr] lg:grid-cols-[2.5rem_1fr_auto]
          gap-x-4 lg:gap-x-6 py-5 lg:py-6 px-4 lg:px-5
          transition-[opacity,background-color] duration-500
        "
        style={{
          borderBottom: HAIRLINE,
          opacity: active ? 1 : 0.8,
          // Hover/active feedback: a soft tint on the row so the ledger reads as interactive.
          backgroundColor: active ? ROW_TINT : "transparent",
        }}
      >
        {/* First column below lg: thumbnail with the Add button centered directly
            beneath it, so the two read as one group (no sticky stage there).
            Above lg: the row index. */}
        <div className="lg:hidden flex w-16 flex-col items-center gap-3.5">
          <div className="relative w-16 aspect-square">
            {item.images ? (
              <Image
                src={item.images.transparent}
                alt=""
                width={1080}
                height={1080}
                sizes="64px"
                loading="lazy"
                style={{ width: "100%", height: "auto" }}
              />
            ) : (
              <SignatureTile item={item} variant="thumb" />
            )}
          </div>
          <AddIconButton name={item.name} added={added} onClick={handleAdd} className="flex" />
        </div>
        <span
          className="hidden lg:block font-body-caps text-[10px] tracking-[0.30em] pt-1.5 transition-colors duration-500"
          style={{ color: active ? "var(--color-grapefruit)" : "rgba(41,45,42,0.4)" }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex flex-col gap-1.5">
          <h3 className="font-headline text-midnight uppercase tracking-headline leading-none text-[clamp(1.25rem,2vw,1.75rem)]">
            {item.name}
          </h3>
          <p className="font-body-caps text-grapefruit text-[10px] tracking-[0.22em]">
            {item.tags.join(" · ")}
          </p>
          <p className="font-body-mixed text-juniper text-sm leading-relaxed">{item.ingredients}</p>
          <p className="lg:hidden font-body-caps text-midnight/50 text-[10px] tracking-[0.2em] mt-1">
            {calories} cal · {protein} g protein
          </p>
        </div>

        <div className="hidden lg:flex flex-col items-end gap-1 pt-1.5 whitespace-nowrap font-body-caps text-midnight/50 text-[10px] tracking-[0.2em]">
          <span>{calories} cal</span>
          <span>{protein} g protein</span>
        </div>

        {/* Desktop: bottom-right of the row */}
        <AddIconButton
          name={item.name}
          added={added}
          onClick={handleAdd}
          className="hidden lg:flex absolute right-5 bottom-4"
        />
      </div>
    </motion.li>
  );
}

// ─── Group (Bowls / Smoothies) ────────────────────────────────────────────────

function MenuGroup({
  label,
  category,
  items,
  activeId,
  onActivate,
  variants,
  reduced,
}: {
  label: string;
  category: SignatureCategory;
  items: SignatureItem[];
  activeId: string;
  onActivate: (id: string) => void;
  variants: MenuVariants;
  reduced: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const show = useRevealReady(ref, ENTER_MARGIN);
  return (
    <motion.div
      ref={ref}
      variants={variants.group}
      initial={reduced ? false : "hidden"}
      animate={reduced || show ? "show" : "hidden"}
    >
      <motion.div variants={variants.rise} className="flex items-baseline justify-between gap-4 pb-3 px-4 lg:px-5">
        <span className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]">{label}</span>
        <span className="font-body-caps text-midnight text-[10px] tracking-[0.22em] text-right">
          {priceNote(category)}
        </span>
      </motion.div>
      <motion.div variants={variants.hairline} className="h-px bg-midnight/40 origin-left" aria-hidden />
      <ul>
        {items.map((item, i) => (
          <MenuRow
            key={item.id}
            item={item}
            index={i}
            active={item.id === activeId}
            onActivate={() => onActivate(item.id)}
            variants={variants}
          />
        ))}
      </ul>
    </motion.div>
  );
}

// ─── Stage (desktop only) ─────────────────────────────────────────────────────
// Every item's PNG is stacked in the same box and cross-faded by opacity, so
// every image is fetched as the stage nears the viewport and a hover never
// waits on the network. Below lg the stage is display:none, so the lazy
// images are never requested there.

function MenuStage({ active, reduced }: { active: SignatureItem; reduced: boolean }) {
  const swap = reduced
    ? { duration: 0 }
    : { duration: 0.5, ease: SWAP_EASE };
  const ref = useRef<HTMLDivElement>(null);
  const show = useRevealReady(ref, ENTER_MARGIN);

  return (
    <motion.div
      ref={ref}
      className="sticky"
      style={{ top: `calc(${NAV_HEIGHT_PX}px + 2rem)` }}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: reduced || show ? 1 : 0 }}
      transition={{ duration: reduced ? 0 : 1.2, ease: REVEAL_EASE, delay: reduced ? 0 : 0.3 }}
    >
      <div className="relative w-full aspect-square">
        {ALL_ITEMS.map((item) => {
          const isActive = item.id === active.id;
          return (
            <motion.div
              key={item.id}
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: isActive ? 1 : 0, y: isActive || reduced ? 0 : 8 }}
              transition={swap}
              // The Seasonal renders a card that turns, so the active item has
              // to take clicks. Everything else in the stack stays inert.
              style={{ zIndex: isActive ? 1 : 0, pointerEvents: isActive && !item.images ? "auto" : "none" }}
              aria-hidden={!isActive}
            >
              {item.images ? (
                <Image
                  src={item.images.transparent}
                  alt={isActive ? active.name : ""}
                  width={1080}
                  height={1080}
                  sizes="(min-width: 1024px) 40vw, 0px"
                  loading="lazy"
                  style={{ width: "100%", height: "auto" }}
                />
              ) : (
                <SignatureTile item={item} variant="stage" active={isActive} />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-2" aria-live="polite">
        <span className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]">
          {active.category === "bowl" ? "Signature Bowl" : "Signature Smoothie"}
        </span>
        <motion.h3
          key={active.id}
          className="heading-3 text-midnight uppercase tracking-headline"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={swap}
        >
          {active.name}
        </motion.h3>
        <span className="font-body-caps text-grapefruit text-[10px] tracking-[0.22em]">
          {active.tags.join(" · ")}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function SignatureMenuSection() {
  const reduced = useReducedMotion() ?? false;
  const variants = makeVariants(reduced);
  const [activeId, setActiveId] = useState(BOWLS[0].id);
  const active = ALL_ITEMS.find((item) => item.id === activeId) ?? BOWLS[0];
  const headerRef = useRef<HTMLDivElement>(null);
  const headerShow = useRevealReady(headerRef, ENTER_MARGIN);

  return (
    <section className="relative w-full bg-cream px-section-x py-section overflow-x-clip">
      <div className="mx-auto w-full max-w-[min(100%,90rem)]">
        {/* Header */}
        <motion.div
          ref={headerRef}
          className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-12"
          variants={variants.header}
          initial={reduced ? false : "hidden"}
          animate={reduced || headerShow ? "show" : "hidden"}
        >
          <div className="flex flex-col">
            <motion.span
              variants={variants.rise}
              className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em] mb-2 lg:mb-3"
            >
              Menu
            </motion.span>
            <motion.h2
              variants={variants.rise}
              className="font-headline text-midnight tracking-headline leading-tight text-[clamp(2.25rem,7vw,4.75rem)]"
            >
              SIGNATURE BOWLS &amp; SMOOTHIES
            </motion.h2>
          </div>
          <motion.div
            variants={variants.rise}
            className="flex flex-col items-start gap-4 lg:items-end"
          >
            <p className="font-body-mixed text-juniper text-sm leading-relaxed max-w-xs lg:text-right">
              Bowls served Medium $12 or Large $15. Smoothies 24 oz, $15.
            </p>
            <CTAButton href="/order" variant="dark">
              Order Now
            </CTAButton>
          </motion.div>
        </motion.div>

        {/* Body: sticky stage (lg+) beside the ledger */}
        <div
          className="mt-12 lg:mt-20 lg:grid lg:grid-cols-[5fr_7fr]"
          style={{ columnGap: "clamp(2rem, 5vw, 6rem)" }}
        >
          <div className="hidden lg:block">
            <MenuStage active={active} reduced={reduced} />
          </div>

          <div className="flex flex-col gap-14 lg:gap-20">
            <MenuGroup
              label="Signature Bowls"
              category="bowl"
              items={BOWLS}
              activeId={activeId}
              onActivate={setActiveId}
              variants={variants}
              reduced={reduced}
            />
            <MenuGroup
              label="Signature Smoothies"
              category="smoothie"
              items={SMOOTHIES}
              activeId={activeId}
              onActivate={setActiveId}
              variants={variants}
              reduced={reduced}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
