"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { CTAButton } from "@/components/ui/CTAButton";
import { useRevealReady } from "@/lib/useRevealReady";

// Two static promo panels, vertical rectangles, replacing the old
// dual-marquee gallery. Each is a dimmed full-bleed image with a centered
// eyebrow + CTA layered over it.
const PANELS = [
  {
    src: "/images-web/Smoothies/Hand-Smoothie-5.jpg",
    alt: "Signature MERŌS bowl",
    eyebrow: "Order",
    cta: "Order Now →",
    href: "/order",
  },
  {
    src: "/images-web/Bowls/Hand-Bowl-5.jpg",
    alt: "Build-your-own bowl",
    eyebrow: "Craft",
    cta: "Build A Bowl →",
    href: "/build",
  },
];

// One shared gutter: between the two panels and from every screen edge.
const PANEL_GAP = "clamp(0.85rem, 1.4vw, 1.4rem)";
const PANEL_OVERLAY = "rgba(0,0,0,0.54)";

// Extra vertical runway the zoomed image has to travel within its panel:
// bigger number = more noticeable parallax, but must stay small enough that
// the oversized image still fully covers the panel at every scroll position.
const PARALLAX_RUNWAY = "18%";

function GalleryPanel({ panel }: { panel: (typeof PANELS)[number] }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: panelRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`-${PARALLAX_RUNWAY}`, PARALLAX_RUNWAY]);
  // The photo fades up only once it has decoded; until then the panel is a
  // dark field with its eyebrow and button, never a half-loaded image.
  const show = useRevealReady(panelRef, "0px");

  return (
    <div
      ref={panelRef}
      className="flex-none sm:flex-1 sm:basis-0 h-[clamp(300px,92vw,440px)] sm:h-[clamp(420px,52vw,760px)]"
      style={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/*
        Two layers: the motion.div is exactly panel-sized, so its percentage
        translateY resolves against the panel height (predictable travel
        distance). The oversized image lives inside it, sized/offset by the
        same runway so it always fully covers the panel at both scroll
        extremes.
      */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: show ? 1 : 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "absolute", inset: 0, y }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `-${PARALLAX_RUNWAY}`,
            height: `calc(100% + 2 * ${PARALLAX_RUNWAY})`,
          }}
        >
          <Image
            src={panel.src}
            alt={panel.alt}
            fill
            className="object-cover scale-110"
            sizes="(max-width: 639px) 100vw, 50vw"
          />
        </div>
      </motion.div>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: PANEL_OVERLAY }} />

      {/* Centered eyebrow + button */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 2rem",
        }}
      >
        <span className="font-body-caps text-cream/50 text-[10px] tracking-[0.30em] mb-2 sm:mb-3">
          {panel.eyebrow}
        </span>
        <CTAButton href={panel.href} variant="light">
          {panel.cta}
        </CTAButton>
      </div>
    </div>
  );
}

export function GallerySection() {
  return (
    <section
              aria-label="Explore MERŌS"
      className="flex flex-col sm:flex-row"
      style={
        {
          width: "100%",
          background: "var(--color-cream)",
          padding: PANEL_GAP,
          gap: PANEL_GAP,
          "--panel-gap": PANEL_GAP,
        } as React.CSSProperties
      }
    >
      {PANELS.map((panel, i) => (
        <GalleryPanel key={i} panel={panel} />
      ))}
    </section>
  );
}
