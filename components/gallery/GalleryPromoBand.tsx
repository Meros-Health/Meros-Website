"use client";

import Image from "next/image";
import { CTAButton } from "@/components/ui/CTAButton";
import { HOME_PROMOS, type HomePromo } from "@/lib/home/homeGallery";
import { useParallax } from "@/lib/useParallax";
import { useRevealReady } from "@/lib/useRevealReady";

// The two photographs that open the home page's closing section: a full-bleed
// image under a scrim with one button centred on it, and no type. The label is
// the button, which is why there is no line of small caps above it.
//
// It sits above the wall, not inside it. The panels stand on cream with a
// gutter around and between them, where a wall row is flush to the page edge,
// so the two cannot share a container: this is a band of framed images and the
// wall under it is a wall. Shape lives in app/globals.css under
// "Home gallery: promo band".

// How far the image travels against the scroll, as a fraction of the panel's
// height, in each direction. The one wall-style drift left on the site: two
// photographs, so the eye can hold both. The layer has to
// overhang the panel by exactly this much top and bottom or an edge goes empty
// at the extremes; --promo-parallax below is set from this constant so the two
// cannot drift apart.
const PARALLAX = 0.12;

function PromoPanel({ promo }: { promo: HomePromo }) {
  const { panelRef, layerRef } = useParallax<HTMLDivElement, HTMLDivElement>(PARALLAX);
  // The photograph fades up only once it has decoded. Until then the panel is
  // a dark field with its button on it, never a half-painted image.
  const show = useRevealReady(panelRef, "0px");

  return (
    <div
      ref={panelRef}
      className="gallery-promo-panel"
      style={{ "--promo-parallax": `${PARALLAX * 100}%` } as React.CSSProperties}
    >
      <div ref={layerRef} className="gallery-promo-layer" style={{ opacity: show ? 1 : 0 }}>
        <Image
          src={promo.src}
          alt={promo.alt}
          fill
          sizes="(max-width: 639px) 100vw, 50vw"
          className="object-cover object-center"
        />
      </div>
      <div aria-hidden className="gallery-promo-scrim" />

      <div className="gallery-promo-action">
        <CTAButton href={promo.cta.href} variant="light">
          {promo.cta.label} →
        </CTAButton>
      </div>
    </div>
  );
}

export function GalleryPromoBand() {
  return (
    <div className="gallery-promo">
      {HOME_PROMOS.map((promo) => (
        <PromoPanel key={promo.id} promo={promo} />
      ))}
    </div>
  );
}
