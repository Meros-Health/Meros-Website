"use client";

import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { SignatureTile } from "@/components/ui/SignatureTile";
import { useAddedBeat } from "@/lib/useAddedBeat";
import { addSignatureDirect, needsConfiguration, startingPrice } from "@/lib/menu/signatureAdd";
import { listBowls, listSmoothies, shortName, type SignatureItem } from "@/lib/menu/signatures";
import { EntranceReveal } from "@/components/transition/EntranceReveal";

// Menu data comes from lib/menu/menu.json via lib/menu/signatures.ts, the
// same file the in-store Menu TV renders from.

// ── Menu card ──────────────────────────────────────────────────────────────────

function MenuCard({ item, priority = false }: { item: SignatureItem; priority?: boolean }) {
  const addItem = useCartStore((s) => s.addItem);
  const openAdd = useCartStore((s) => s.openAdd);
  const { added, flash } = useAddedBeat(item.id);
  // The card shows where the price starts; size and yogurt (and any changes)
  // are chosen in the add modal for a bowl. A smoothie has one size and its
  // default yogurt, so its price is its price and it adds in one press.
  const starting = startingPrice(item);

  const handleAdd = () => {
    if (added) return;
    if (needsConfiguration(item)) {
      openAdd(item.id);
      return;
    }
    if (addSignatureDirect(item, addItem) === "added") flash();
  };

  return (
    <article
      className="bg-cream flex flex-col"
      style={{
        border: "0.5px solid rgba(41,45,42,0.15)",
        containerType: "inline-size",
        maxWidth: "var(--menu-card-max-width)",
      }}
    >
      {/* Square-cropped image: always rendered at ~half a 2-column grid, at every
          breakpoint. An item without photography gets the typographic tile in
          the same square. */}
      <div className="relative w-full aspect-square overflow-hidden">
        {item.images ? (
          <Image
            src={item.images.photo}
            alt={item.name}
            fill
            sizes="(max-width: 767px) 92vw, (max-width: 1279px) 45vw, 560px"
            priority={priority}
            className="object-cover object-center"
          />
        ) : (
          <SignatureTile item={item} variant="card" />
        )}
      </div>

      {/* Info: sized off the card's own (container-query) width, not the viewport, so
          text always fits 2-up regardless of how much room the sidebar title leaves it */}
      <div
        className="flex flex-1 flex-col min-w-0"
        style={{ gap: "var(--menu-card-gap)", padding: "var(--menu-card-padding)" }}
      >
        {/* Name + price */}
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className="font-headline text-midnight leading-none min-w-0"
            style={{ fontSize: "var(--menu-card-name-size)" }}
          >
            {shortName(item)}
          </h3>
          <span
            className="font-body-caps text-juniper shrink-0"
            style={{ fontSize: "var(--menu-card-price-size)" }}
          >
            {starting === undefined
              ? "Unavailable"
              : `${starting.from ? "From " : ""}$${starting.price.toFixed(2)}`}
          </span>
        </div>

        {/* Tags */}
        <p
          className="font-body-caps text-grapefruit tracking-widest -mt-0.5"
          style={{ fontSize: "var(--menu-card-tag-size)" }}
        >
          {item.tags.join(" · ")}
        </p>

        {/* Ingredients: toppings only. The yogurt is chosen in the add modal. */}
        <p
          className="font-body-mixed text-juniper leading-relaxed"
          style={{ fontSize: "var(--menu-card-desc-size)" }}
        >
          {item.ingredients}
        </p>

        <div className="mt-auto flex flex-col" style={{ gap: "var(--menu-card-gap)" }}>
          <AddToCartButton onClick={handleAdd} added={added} />
        </div>
      </div>
    </article>
  );
}

// ── Menu section ─────────────────────────────────────────────────────────────
//
// Layout strategy: prefer two cards per row, fall back to one when that would
// crowd them. The grid uses auto-fit against --menu-card-min-width rather than
// a breakpoint, so the second column appears exactly when there is room for it
// and collapses on its own when there is not. max-width caps it at two, since
// a third column on a wide monitor makes the cards smaller than they read well
// at. The cards are container-query sized, so a half-width card scales its own
// type down without any viewport media query.
//   - 2xl and up: flex-row, title sticky on the left, grid beside it. There is
//                 still room for two cards next to a title at this width.
//   - Below 2xl:  flex-col, title stacked, so the grid gets the full content
//                 width. This is what lets 1280 and horizontal tablets go 2-up;
//                 with the title beside it, 1280 left the grid under 640px and
//                 collapsed to a single column.

function MenuSection({
  id,
  titleTop,
  titleBottom,
  items,
  heading = "h2",
  priorityFirstImage = false,
}: {
  id?: string;
  titleTop: string;
  titleBottom: string;
  items: SignatureItem[];
  heading?: "h1" | "h2";
  /** Marks the first card's image as the LCP candidate (above the fold). */
  priorityFirstImage?: boolean;
}) {
  const Title = heading;
  return (
    <section
      id={id}
      className="px-[7vw] pt-28 pb-24"
      style={{ borderTop: "0.5px solid rgba(41,45,42,0.12)" }}
    >
      <div
        className="flex flex-col 2xl:flex-row 2xl:items-start"
        style={{ gap: "clamp(2rem, 4vw, 4.5rem)" }}
      >
        {/* Title */}
        <div className="2xl:sticky 2xl:top-28 2xl:shrink-0">
          <Title
            className="font-headline text-midnight leading-[0.9] uppercase"
            style={{ fontSize: "clamp(2.5rem, 4.5vw, 4.25rem)" }}
          >
            {titleTop}
            <br />
            {titleBottom}
          </Title>
        </div>

        {/* Grid: two columns wherever they fit, one when they do not, never three */}
        <div className="menu-grid-wrap">
          <div className="menu-grid">
            {items.map((item, i) => (
              <MenuCard key={item.id} item={item} priority={priorityFirstImage && i === 0} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function OrderPage() {
  return (
    <main>
      {/* ── Page title: top of the page every fresh load lands on ── */}
      <section className="px-[7vw] pt-36 pb-4">
        <EntranceReveal index={0}>
          <h1
            className="font-headline text-midnight leading-[0.9] uppercase"
            style={{ fontSize: "clamp(3rem, 7vw, 6rem)" }}
          >
            Our Menu
          </h1>
        </EntranceReveal>
        <EntranceReveal index={1}>
          <p className="font-body-mixed text-sm text-juniper mt-4 max-w-md">
            Signature bowls and smoothies, strained and built in-house.
          </p>
        </EntranceReveal>
      </section>

      {/* ── Signature Bowls ── */}
      <MenuSection
        id="bowls"
        titleTop="Signature"
        titleBottom="Bowls"
        items={listBowls()}
        priorityFirstImage
      />

      {/* ── Signature Smoothies ── */}
      <MenuSection id="smoothies" titleTop="Signature" titleBottom="Smoothies" items={listSmoothies()} />
    </main>
  );
}
