"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { EMPTY_NUTRITION } from "@/lib/menu/nutrition";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import {
  getDefaultSizeId,
  getSizeLabel,
  getSizeTiers,
  listBowls,
  listSmoothies,
  shortName,
  type SignatureCategory,
  type SignatureItem,
} from "@/lib/menu/signatures";
import { EntranceReveal } from "@/components/transition/EntranceReveal";

// Menu data comes from lib/menu/menu.json via lib/menu/signatures.ts, the
// same file the in-store Menu TV renders from.

// ── Size toggle ────────────────────────────────────────────────────────────────
// Squared segmented control. Renders nothing for single-size categories
// (smoothies), so the card layout only gains a row where there is a choice.

function SizeToggle({
  category,
  value,
  onChange,
}: {
  category: SignatureCategory;
  value: string;
  onChange: (sizeId: string) => void;
}) {
  const tiers = getSizeTiers(category);
  if (tiers.length < 2) return null;

  return (
    <div className="flex" role="group" aria-label="Size">
      {tiers.map((tier, i) => {
        const selected = tier.id === value;
        return (
          <button
            key={tier.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(tier.id)}
            className="flex-1 font-body-caps tracking-widest transition-colors duration-200"
            style={{
              fontSize: "clamp(0.5rem, 3.4cqw, 0.625rem)",
              padding: "clamp(0.35rem, 2.6cqw, 0.5rem) 0",
              border: selected
                ? "0.5px solid var(--color-grapefruit)"
                : "0.5px solid rgba(41,45,42,0.25)",
              // Hairline borders would double up where the two buttons meet
              marginLeft: i === 0 ? 0 : "-0.5px",
              background: selected ? "var(--color-grapefruit)" : "transparent",
              color: selected ? "var(--color-cream)" : "var(--color-midnight)",
            }}
          >
            {tier.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Menu card ──────────────────────────────────────────────────────────────────

function MenuCard({ item, priority = false }: { item: SignatureItem; priority?: boolean }) {
  const addItem = useCartStore((s) => s.addItem);
  const [sizeId, setSizeId] = useState(() => getDefaultSizeId(item.category));
  const [added, setAdded] = useState(false);
  const addedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A size can vanish from the menu under a mounted card (I1); price nothing rather than crash.
  const price = item.sizes[sizeId]?.price ?? 0;

  useEffect(() => {
    return () => {
      if (addedTimeout.current) clearTimeout(addedTimeout.current);
    };
  }, []);

  const handleAdd = () => {
    const result = addItem({
      kind: "signature",
      productId: item.id,
      name: item.name,
      size: { id: sizeId, label: getSizeLabel(item.category, sizeId) },
      nutrition: { ...EMPTY_NUTRITION },
      quantity: 1,
      unitPrice: price,
    });
    // At the 99 cap nothing was added, so no "Added" feedback either.
    if (result !== "added") return;
    setAdded(true);
    if (addedTimeout.current) clearTimeout(addedTimeout.current);
    addedTimeout.current = setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article
      className="bg-cream flex flex-col"
      style={{ border: "0.5px solid rgba(41,45,42,0.15)", containerType: "inline-size" }}
    >
      {/* Square-cropped image — always rendered at ~half a 2-column grid, at every breakpoint */}
      <div className="relative w-full aspect-square overflow-hidden">
        <Image
          src={item.images.photo}
          alt={item.name}
          fill
          sizes="(max-width: 1024px) 42vw, 22vw"
          priority={priority}
          className="object-cover object-center"
        />
      </div>

      {/* Info — sized off the card's own (container-query) width, not the viewport, so
          text always fits 2-up regardless of how much room the sidebar title leaves it */}
      <div
        className="flex flex-1 flex-col min-w-0"
        style={{ gap: "clamp(0.35rem, 3cqw, 0.625rem)", padding: "clamp(0.6rem, 5cqw, 1.25rem)" }}
      >
        {/* Name + price */}
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className="font-headline text-midnight leading-none min-w-0"
            style={{ fontSize: "clamp(0.85rem, 9cqw, 1.5rem)" }}
          >
            {shortName(item)}
          </h3>
          <span
            className="font-body-caps text-juniper shrink-0"
            style={{ fontSize: "clamp(0.55rem, 4.2cqw, 0.75rem)" }}
          >
            ${price.toFixed(2)}
          </span>
        </div>

        {/* Tags */}
        <p
          className="font-body-caps text-grapefruit tracking-widest -mt-0.5"
          style={{ fontSize: "clamp(0.48rem, 3.4cqw, 0.625rem)" }}
        >
          {item.tags.join(" · ")}
        </p>

        {/* Ingredients */}
        <p
          className="font-body-mixed text-juniper leading-relaxed"
          style={{ fontSize: "clamp(0.62rem, 4.6cqw, 0.875rem)" }}
        >
          {item.ingredients}
        </p>

        {/* Size + add to cart */}
        <div className="mt-auto flex flex-col" style={{ gap: "clamp(0.35rem, 3cqw, 0.625rem)" }}>
          <SizeToggle category={item.category} value={sizeId} onChange={setSizeId} />
          <AddToCartButton onClick={handleAdd} added={added} />
        </div>
      </div>
    </article>
  );
}

// ── Menu section ─────────────────────────────────────────────────────────────
//
// Layout strategy: the item grid is always 2 columns, at every breakpoint —
// only card text/image sizes shrink (via clamp) to keep it from crowding.
//   - Wide (md+):   flex-row — title on the left, grid fills the remaining width.
//   - Mobile (<md): flex-col — title stacks above the full-width grid.

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
        className="flex flex-col md:flex-row md:items-start"
        style={{ gap: "clamp(2rem, 4vw, 4.5rem)" }}
      >
        {/* Title */}
        <div className="md:sticky md:top-28 md:shrink-0">
          <Title
            className="font-headline text-midnight leading-[0.9] uppercase"
            style={{ fontSize: "clamp(2.5rem, 4.5vw, 4.25rem)" }}
          >
            {titleTop}
            <br />
            {titleBottom}
          </Title>
        </div>

        {/* Grid — always 2 columns; only type/image scale shrink to fit at narrower widths */}
        <div
          className="min-w-0 flex-1 grid grid-cols-2"
          style={{ gap: "clamp(0.6rem, 2.5vw, 1.25rem)" }}
        >
          {items.map((item, i) => (
            <MenuCard key={item.id} item={item} priority={priorityFirstImage && i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function OrderPage() {
  return (
    <main>
      {/* ── Page title — top of the page every fresh load lands on ── */}
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
