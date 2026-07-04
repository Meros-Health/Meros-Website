"use client";

import Image from "next/image";
import { CTAButton } from "@/components/ui/CTAButton";

const TOP_ROW_IMAGES = [
  { src: "/images-web/Bowls/Moment-1.jpg", alt: "The Moment bowl" },
  { src: "/images-web/Smoothies/rise-1.jpg", alt: "The Rise smoothie" },
  { src: "/images-web/Bowls/Silk-1.jpg", alt: "The Silk bowl" },
  { src: "/images-web/Smoothies/crave-1.jpg", alt: "The Crave smoothie" },
  { src: "/images-web/Bowls/Tropic-1.jpg", alt: "The Tropic bowl" },
  { src: "/images-web/Smoothies/essence-1.jpg", alt: "The Essence smoothie" },
  { src: "/images-web/Bowls/Bloom-1.jpg", alt: "The Bloom bowl" },
  { src: "/images-web/Smoothies/cabana-1.jpg", alt: "The Cabana smoothie" },
];

const BOTTOM_ROW_IMAGES = [
  { src: "/images-web/Gallery/Gallery-1.jpg", alt: "Fresh yogurt bowl" },
  { src: "/images-web/Gallery/Gallery-2.jpg", alt: "Seasonal toppings" },
  { src: "/images-web/Gallery/Gallery-3.jpg", alt: "Meros storefront" },
  { src: "/images-web/Gallery/Gallery-4.jpg", alt: "Smoothie preparation" },
  { src: "/images-web/Gallery/Gallery-5.jpg", alt: "Granola and berries" },
  { src: "/images-web/Gallery/Gallery-6.jpg", alt: "House-strained yogurt" },
  { src: "/images-web/Gallery/Gallery-7.jpg", alt: "Menu item close-up" },
  { src: "/images-web/Gallery/Gallery-8.jpg", alt: "Meros bowl detail" },
];

// Each row's set is doubled — CSS translates -50% → snaps back with no visible seam.
const TOP_ROW_DOUBLED = [...TOP_ROW_IMAGES, ...TOP_ROW_IMAGES];
const BOTTOM_ROW_DOUBLED = [...BOTTOM_ROW_IMAGES, ...BOTTOM_ROW_IMAGES];
const ROW_DIVIDER_PX = 12;

function GalleryRow({
  images,
  reverse,
}: {
  images: { src: string; alt: string }[];
  reverse?: boolean;
}) {
  return (
    <div style={{ position: "relative", flex: "1 1 0%", overflow: "hidden" }}>
      <div
        className={
          reverse ? "gallery-marquee-track gallery-marquee-track-reverse" : "gallery-marquee-track"
        }
        style={{
          display:    "flex",
          height:     "100%",
          willChange: "transform",
          width:      "max-content",
        }}
      >
        {images.map((img, i) => (
          <div
            key={i}
            style={{
              position:    "relative",
              flexShrink:  0,
              height:      "100%",
              aspectRatio: "1 / 1",
            }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover"
              sizes="(max-width: 639px) 40vw, 50vh"
            />
          </div>
        ))}
      </div>

      {/* Per-row overlay — divider gap between rows stays undarkened */}
      <div
        aria-hidden
        style={{
          position:   "absolute",
          inset:      0,
          background: "rgba(0,0,0,0.54)",
        }}
      />
    </div>
  );
}


export function GallerySection() {
  return (
    <section
      aria-label="Gallery"
      style={{
        position: "relative",
        width:    "100%",
        height:   "100vh",
        overflow: "hidden",
      }}
    >
      {/* ── Background: full-bleed sliding gallery (2 rows) + dark overlay ── */}
      <div
        aria-hidden
        style={{
          position:      "absolute",
          inset:         0,
          display:       "flex",
          flexDirection: "column",
        }}
      >
        <GalleryRow images={TOP_ROW_DOUBLED} />

        <div
          aria-hidden
          style={{
            flexShrink: 0,
            height:     ROW_DIVIDER_PX,
            background: "var(--color-cream)",
          }}
        />

        <GalleryRow images={BOTTOM_ROW_DOUBLED} reverse />
      </div>

      {/* ── Foreground — one CTA centered per gallery row ───────────────── */}
      <div
        style={{
          position:      "absolute",
          inset:         0,
          zIndex:        1,
          display:       "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex:           "1 1 0%",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "0 2rem",
          }}
        >
          <div className="flex flex-col items-center">
            <span className="font-body-caps text-cream/50 text-[10px] tracking-[0.30em] mb-2 sm:mb-3">
              Our Menu
            </span>
            <CTAButton href="/order" variant="light">
              Order Now →
            </CTAButton>
          </div>
        </div>

        <div aria-hidden style={{ flexShrink: 0, height: ROW_DIVIDER_PX }} />

        <div
          style={{
            flex:           "1 1 0%",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "0 2rem",
          }}
        >
          <div className="flex flex-col items-center">
            <span className="font-body-caps text-cream/50 text-[10px] tracking-[0.30em] mb-2 sm:mb-3">
              Build your own
            </span>
            <CTAButton href="/build" variant="light">
              Build A Bowl →
            </CTAButton>
          </div>
        </div>
      </div>
    </section>
  );
}
