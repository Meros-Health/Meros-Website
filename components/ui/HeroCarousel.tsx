"use client";

import Image from "next/image";

// Superset of the product + gallery imagery, interleaved so no two adjacent
// tiles are the same category. Reuses the `.gallery-marquee-track` keyframe
// from globals.css (doubled array + translateX(-50%) = seamless loop).
const CAROUSEL_IMAGES = [
  { src: "/images-web/Bowls/Moment-1.jpg", alt: "The Moment bowl" },
  { src: "/images-web/Smoothies/rise-1.jpg", alt: "The Rise smoothie" },
  { src: "/images-web/Gallery/Gallery-1.jpg", alt: "Fresh yogurt bowl" },
  { src: "/images-web/Bowls/Silk-1.jpg", alt: "The Silk bowl" },
  { src: "/images-web/Smoothies/crave-1.jpg", alt: "The Crave smoothie" },
  { src: "/images-web/Gallery/Gallery-2.jpg", alt: "Seasonal toppings" },
  { src: "/images-web/Bowls/Tropic-1.jpg", alt: "The Tropics bowl" },
  { src: "/images-web/Smoothies/recovery-2.jpg", alt: "The Recovery smoothie" },
  { src: "/images-web/Gallery/Gallery-3.jpg", alt: "MERŌS storefront" },
  { src: "/images-web/Bowls/Tropic-2.jpg", alt: "The Tropics bowl" },
  { src: "/images-web/Smoothies/cabana-1.jpg", alt: "The Cabana smoothie" },
  { src: "/images-web/Gallery/Gallery-5.jpg", alt: "Granola and berries" },
  { src: "/images-web/Bowls/Crunch-1.jpg", alt: "The Crunch bowl" },
  { src: "/images-web/Smoothies/focus-1.jpg", alt: "The Focus smoothie" },
  { src: "/images-web/Gallery/Gallery-7.jpg", alt: "Menu item close-up" },
  { src: "/images-web/Bowls/Crunch-2.jpg", alt: "The Crunch bowl" },
  { src: "/images-web/Smoothies/recovery-1.jpg", alt: "The Recovery smoothie" },
  { src: "/images-web/Gallery/Gallery-8.jpg", alt: "MERŌS bowl detail" },
];

const DOUBLED = [...CAROUSEL_IMAGES, ...CAROUSEL_IMAGES];

/**
 * Single-row continuous marquee, images travelling left → right.
 * A uniform `gap` is applied as a trailing margin on every tile (including the
 * last) so the doubled array still loops seamlessly at translateX(-50%).
 */
export function HeroCarousel({ gap, tileHeight }: { gap: string; tileHeight: string }) {
  return (
    <div style={{ position: "relative", height: tileHeight, overflow: "hidden" }}>
      <div
        className="gallery-marquee-track gallery-marquee-track-reverse"
        style={{
          display: "flex",
          height: "100%",
          width: "max-content",
          willChange: "transform",
        }}
      >
        {DOUBLED.map((img, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              flexShrink: 0,
              height: "100%",
              aspectRatio: "1 / 1",
              marginRight: gap,
            }}
          >
            {/* Lazy: below 1024px the carousel is display:none, and a lazy
                image that never intersects is never requested. On desktop
                the row sits in the first viewport, so it loads at once. */}
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover"
              sizes="14vw"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
