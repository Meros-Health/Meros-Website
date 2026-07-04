"use client";

import Image from "next/image";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { EMPTY_NUTRITION } from "@/lib/menu/nutrition";

// ── Menu data ──────────────────────────────────────────────────────────────────

type MenuItem = {
  id: string;
  name: string;
  tag: string;
  ingredients: string[];
  price: number;
  image: string;
};

const SIGNATURE_BOWLS: MenuItem[] = [
  {
    id: "moment",
    name: "Moment",
    tag: "Seasonal & Light",
    ingredients: ["Greek yogurt", "seasonal berries", "wildflower honey", "toasted coconut", "chia"],
    price: 15.0,
    image: "/images-web/Bowls/Moment-1.jpg",
  },
  {
    id: "silk",
    name: "Silk",
    tag: "Tropical & Smooth",
    ingredients: ["Greek yogurt", "mango", "passion fruit", "lychee", "lime zest"],
    price: 15.5,
    image: "/images-web/Bowls/Silk-1.jpg",
  },
  {
    id: "crunch",
    name: "Crunch",
    tag: "Granola & Nut Butter",
    ingredients: ["Greek yogurt", "housemade granola", "almond butter", "banana", "cacao nibs", "maple"],
    price: 14.5,
    image: "/images-web/Bowls/Crunch-1.jpg",
  },
  {
    id: "tropic",
    name: "Tropic",
    tag: "Island Fruit",
    ingredients: ["Greek yogurt", "pineapple", "mango", "coconut flakes", "passion fruit"],
    price: 14.5,
    image: "/images-web/Bowls/Tropic-1.jpg",
  },
  {
    id: "bloom",
    name: "Bloom",
    tag: "Berry & Honey",
    ingredients: ["Greek yogurt", "fresh strawberries", "blueberries", "rose granola", "wildflower honey"],
    price: 14.5,
    image: "/images-web/Bowls/Bloom-1.jpg",
  },
  {
    id: "bounty",
    name: "Bounty",
    tag: "Rich & Layered",
    ingredients: ["Greek yogurt", "mixed berries", "house granola", "hemp seeds", "raw honey"],
    price: 14.5,
    image: "/images-web/Bowls/Bounty-1.jpg",
  },
];

const SIGNATURE_SMOOTHIES: MenuItem[] = [
  {
    id: "rise",
    name: "Rise",
    tag: "Bright & Energizing",
    ingredients: ["orange", "mango", "banana", "turmeric", "fresh ginger"],
    price: 12.0,
    image: "/images-web/Smoothies/rise-1.jpg",
  },
  {
    id: "crave",
    name: "Crave",
    tag: "Cacao & Indulgent",
    ingredients: ["raw cacao", "banana", "peanut butter", "oat milk", "medjool dates"],
    price: 12.5,
    image: "/images-web/Smoothies/crave-1.jpg",
  },
  {
    id: "essence",
    name: "Essence",
    tag: "Green & Cleansing",
    ingredients: ["spinach", "kale", "green apple", "cucumber", "lime", "mint"],
    price: 12.5,
    image: "/images-web/Smoothies/essence-1.jpg",
  },
  {
    id: "recovery",
    name: "Recovery",
    tag: "Protein & Restorative",
    ingredients: ["banana", "blueberry", "vanilla protein", "almond milk", "cinnamon"],
    price: 13.0,
    image: "/images-web/Smoothies/recovery-1.jpg",
  },
  {
    id: "cabana",
    name: "Cabana",
    tag: "Tropical & Coconut",
    ingredients: ["pineapple", "coconut milk", "mango", "passion fruit", "lime"],
    price: 12.5,
    image: "/images-web/Smoothies/cabana-1.jpg",
  },
  {
    id: "nutty",
    name: "Nutty",
    tag: "Almond & Creamy",
    ingredients: ["almond butter", "banana", "oat milk", "wildflower honey", "flax"],
    price: 12.0,
    image: "/images-web/Smoothies/nutty-1.jpg",
  },
];

// ── Menu card ──────────────────────────────────────────────────────────────────

function MenuCard({ item }: { item: MenuItem }) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({
      kind: "signature",
      productId: item.id,
      name: item.name,
      nutrition: { ...EMPTY_NUTRITION },
      quantity: 1,
      unitPrice: item.price,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article
      className="bg-cream flex flex-col"
      style={{ border: "0.5px solid rgba(41,45,42,0.15)", containerType: "inline-size" }}
    >
      {/* Square-cropped image — always rendered at ~half a 2-column grid, at every breakpoint */}
      <div className="relative w-full aspect-square overflow-hidden">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 1024px) 42vw, 22vw"
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
            {item.name}
          </h3>
          <span
            className="font-body-caps text-juniper shrink-0"
            style={{ fontSize: "clamp(0.55rem, 4.2cqw, 0.75rem)" }}
          >
            ${item.price.toFixed(2)}
          </span>
        </div>

        {/* Tag */}
        <p
          className="font-body-caps text-grapefruit tracking-widest -mt-0.5"
          style={{ fontSize: "clamp(0.48rem, 3.4cqw, 0.625rem)" }}
        >
          {item.tag}
        </p>

        {/* Ingredients */}
        <p
          className="font-body-mixed text-juniper leading-relaxed"
          style={{ fontSize: "clamp(0.62rem, 4.6cqw, 0.875rem)" }}
        >
          {item.ingredients.join(", ")}
        </p>

        {/* Add to cart */}
        <button
          type="button"
          onClick={handleAdd}
          className="mt-auto w-full font-body-caps tracking-widest transition-colors duration-200"
          style={{
            fontSize: "clamp(0.5rem, 3.4cqw, 0.625rem)",
            padding: "clamp(0.45rem, 4cqw, 0.75rem) 0",
            border: "0.5px solid",
            borderColor: added ? "var(--color-grapefruit)" : "rgba(41,45,42,0.28)",
            color: added ? "var(--color-grapefruit)" : "var(--color-midnight)",
            background: "transparent",
          }}
        >
          {added ? "Added" : "Add to Cart"}
        </button>
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
}: {
  id?: string;
  titleTop: string;
  titleBottom: string;
  items: MenuItem[];
  heading?: "h1" | "h2";
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
          {items.map((item) => (
            <MenuCard key={item.id} item={item} />
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
        <h1
          className="font-headline text-midnight leading-[0.9] uppercase"
          style={{ fontSize: "clamp(3rem, 7vw, 6rem)" }}
        >
          Our Menu
        </h1>
        <p className="font-body-mixed text-sm text-juniper mt-4 max-w-md">
          Signature bowls and smoothies, strained and built in-house.
        </p>
      </section>

      {/* ── Signature Bowls ── */}
      <MenuSection id="bowls" titleTop="Signature" titleBottom="Bowls" items={SIGNATURE_BOWLS} />

      {/* ── Signature Smoothies ── */}
      <MenuSection id="smoothies" titleTop="Signature" titleBottom="Smoothies" items={SIGNATURE_SMOOTHIES} />
    </main>
  );
}
