"use client";

import Image from "next/image";
import { useRef } from "react";
import { useCartStore } from "@/store/cartStore";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Reveal } from "@/components/ui/ScrollReveal";
import { useAddedBeat } from "@/lib/useAddedBeat";
import { useRevealReady } from "@/lib/useRevealReady";
import { getIngredient } from "@/lib/menu/ingredients";
import { addSignatureDirect, needsConfiguration, startingPrice } from "@/lib/menu/signatureAdd";
import { getDefaultBaseId } from "@/lib/menu/signatureBase";
import { shortName, type SignatureItem } from "@/lib/menu/signatures";
import { getStack } from "@/lib/menu/stacks";

// A category of the menu as a list: name, tags, the recipe, the yogurt it is
// made on, the Stack it pairs with, and the add button. The same list serves
// the home page and /menu, so an item reads and adds the same way on both.
//
// It replaced the gallery wall (2026-09-10). The wall needed two or three
// photographs per item to hold its rows, and after the menu changed only The
// Moment and The Silk still looked like their photographs. The Uber Eats
// shoot of 2026-09-09 gives every item one product photo, which is what this
// layout is built around: one picture per item where the surface wants one,
// and type doing the rest.
//
// Two variants. "cards" (/menu) puts every item's photo above its text from
// tablet width up; on a phone the photo is a small square beside the text so
// the list stays readable. "list" (home) keeps the type in one column and
// hangs the chosen photos beside it, captioned; on a phone only an item with
// a top-down cut-out gets a small thumbnail, so a new customer can see what a
// bowl looks like without the page turning into a scroll of photographs.
//
// No price on the item. Every bowl costs the same and every smoothie costs
// the same, so the caller states it once above the list (CategoryHeading,
// categoryPriceLine). The exception is an item the menu cannot price at all.

export type SignatureListVariant = "cards" | "list";

interface SignatureListProps {
  items: readonly SignatureItem[];
  variant: SignatureListVariant;
  /** Which items show their product photo from tablet width up. */
  photos: "all" | readonly string[];
  /** Below tablet width: the photo as a small square, the cut-out, or nothing. */
  mobileThumb: "square" | "transparent" | "none";
  /** Which pictured items carry a "Best Seller" tag beside their caption (tablet width up). */
  bestSellers?: readonly string[];
}

const THUMB = "4.5rem";

export function SignatureList({ items, variant, photos, mobileThumb, bestSellers }: SignatureListProps) {
  const hasPhoto = (item: SignatureItem) =>
    item.images !== undefined && (photos === "all" || photos.includes(item.id));

  if (variant === "list") {
    const pictured = items.filter(hasPhoto);
    return (
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ul className="grid grid-cols-1 gap-y-6">
          {items.map((item) => (
            <RevealRow key={item.id}>
              <Entry item={item} thumb={thumbSrc(item, mobileThumb)} />
            </RevealRow>
          ))}
        </ul>
        {pictured.length > 0 && (
          <ul className="hidden md:grid grid-cols-1 gap-y-8 content-start">
            {pictured.map((item) => (
              <RevealRow key={item.id} delay={0.2}>
                <Figure
                  item={item}
                  sizes="(min-width: 768px) 45vw, 100vw"
                  caption
                  bestSeller={bestSellers?.includes(item.id)}
                />
              </RevealRow>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2 md:gap-y-14">
      {items.map((item) => (
        <RevealRow key={item.id}>
          {hasPhoto(item) && (
            <div className="hidden md:block mb-5">
              <Figure item={item} sizes="(min-width: 768px) 45vw, 100vw" />
            </div>
          )}
          <Entry item={item} thumb={thumbSrc(item, mobileThumb)} />
        </RevealRow>
      ))}
    </ul>
  );
}

/**
 * One row (a signature's text, or its photo), fading in as a single unit the
 * moment that row itself crosses into view.
 *
 * Every row used to share one trigger for the whole list (the list's own
 * useRevealReady), staggered only by each item's index. That reads fine for
 * the two or three items near the top, the ones still close to the viewport
 * when the list itself comes into view, but a category with more rows than
 * fit on one screen finishes the whole staggered sequence off screen: by the
 * time a customer scrolls down to "Crunch" or "The Tropic" the animation
 * already played out above them, so the row is just there, fully opaque, no
 * fade. Giving each row its own observer fixes that: a row reveals exactly
 * when it crosses into view, never before, so every item gets the same
 * simple fade the photographs already had.
 */
function RevealRow({
  delay = 0,
  children,
}: {
  /** Extra delay, for a second column revealing a beat behind the first. */
  delay?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const show = useRevealReady(ref, "-80px");
  return (
    <li ref={ref}>
      <Reveal show={show} delay={delay}>
        {children}
      </Reveal>
    </li>
  );
}

function thumbSrc(item: SignatureItem, mode: SignatureListProps["mobileThumb"]): string | undefined {
  if (mode === "square") return item.images?.photo;
  if (mode === "transparent") return item.images?.transparent;
  return undefined;
}

/** The product photo at its shot proportion (5:4), optionally captioned with the item's name. */
function Figure({
  item,
  sizes,
  caption = false,
  bestSeller = false,
}: {
  item: SignatureItem;
  sizes: string;
  caption?: boolean;
  bestSeller?: boolean;
}) {
  if (!item.images) return null;
  return (
    <figure>
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "5 / 4" }}>
        <Image src={item.images.photo} alt={item.name} fill sizes={sizes} className="object-cover object-center" />
      </div>
      {caption && (
        <figcaption className="flex items-baseline gap-2 mt-3">
          <span className="font-body-caps text-midnight tracking-headline text-label uppercase">{item.name}</span>
          {bestSeller && (
            <span className="font-body-caps text-grapefruit-text tracking-headline text-label uppercase">
              Best Seller
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * One item's type and its add button. `thumb` is drawn beside the text below
 * tablet width only; it is display:none above it, which the reveal gate
 * already ignores (revealImages skips images with no box).
 */
function Entry({ item, thumb }: { item: SignatureItem; thumb?: string }) {
  const addItem = useCartStore((s) => s.addItem);
  const openAdd = useCartStore((s) => s.openAdd);
  const { added, flash } = useAddedBeat(item.id);
  // A bowl needs a size and a yogurt, so its button opens the add modal. A
  // smoothie has one size and its default yogurt, so it adds in one press.
  const starting = startingPrice(item);
  const base = getDefaultBaseId(item);
  const stack = item.suggestedStack ? getStack(item.suggestedStack) : undefined;

  const handleAdd = () => {
    if (added) return;
    if (needsConfiguration(item)) {
      openAdd(item.id);
      return;
    }
    if (addSignatureDirect(item, addItem) === "added") flash();
  };

  return (
    <article className="border-t border-midnight/rule pt-4 flex gap-4">
      {thumb && (
        <div className="md:hidden relative flex-none overflow-hidden" style={{ width: THUMB, height: THUMB }}>
          <Image src={thumb} alt="" fill sizes="72px" className="object-cover object-center" />
        </div>
      )}

      <div className="min-w-0 flex flex-col items-start">
        <h3
          className="font-headline text-midnight uppercase leading-[0.92]"
          style={{ fontSize: "clamp(1.5rem, 2.6vw, 2.25rem)" }}
        >
          {shortName(item)}
        </h3>

        <p className="font-body-caps text-grapefruit-text tracking-headline mt-2 text-label uppercase">
          {item.tags.join(" · ")}
        </p>

        {/* Toppings only. The yogurt is chosen in the add modal. */}
        <p className="font-body-mixed text-midnight mt-3 text-sm leading-relaxed">{item.ingredients}.</p>

        <p className="font-body-mixed text-juniper mt-1 text-caption leading-relaxed">
          {base ? `Made on ${getIngredient(base)?.name ?? base}.` : "Made on the yogurt you choose."}
          {stack ? ` Pairs with the ${stack.name}.` : ""}
        </p>

        {starting === undefined && (
          <p className="font-body-caps text-grapefruit-text tracking-headline mt-2 text-label uppercase">Unavailable</p>
        )}

        {/* Named, because "Add to Cart" is the visible text on every one of
            these and a page carries several. */}
        <AddToCartButton
          onClick={handleAdd}
          added={added}
          ariaLabel={`Add ${item.name} to cart`}
          addedAriaLabel={`${item.name} added to cart`}
          className="!w-auto mt-4"
        />
      </div>
    </article>
  );
}
