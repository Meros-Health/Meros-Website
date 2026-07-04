"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const CONFIG = {
  pinDurationVh: 3.5,
  scrub: 0.8,
  phases: {
    titleEnd:           0.35,
    eyebrowStart:       0.28,
    ctaStart:           0.36,
    ctaEnd:             0.50,
    galleryRiseStart:   0.28,
    galleryRiseEnd:     0.44,
    galleryScrollStart: 0.44,
    galleryScrollEnd:   0.95,
  },
  title: {
    travelVh:   0.28,
    finalScale: 0.50,
    ease:       "power2.out",
  },
  content: {
    initialOffsetVh: 0.65,
    ease:            "power3.out",
  },
  slot: {
    top:    "28vh",
    bottom: "5vh",
  },
} as const;

const GALLERY_IMAGES = [
  { src: "/images-web/Gallery/Gallery-1.jpg", alt: "Fresh yogurt bowl" },
  { src: "/images-web/Gallery/Gallery-2.jpg", alt: "Seasonal toppings" },
  { src: "/images-web/Gallery/Gallery-3.jpg", alt: "Meros storefront" },
  { src: "/images-web/Gallery/Gallery-4.jpg", alt: "Smoothie preparation" },
  { src: "/images-web/Gallery/Gallery-5.jpg", alt: "Granola and berries" },
  { src: "/images-web/Gallery/Gallery-6.jpg", alt: "House-strained yogurt" },
  { src: "/images-web/Gallery/Gallery-7.jpg", alt: "Menu item close-up" },
  { src: "/images-web/Gallery/Gallery-8.jpg", alt: "Meros bowl detail" },
];

const LIGHT_BG  = "var(--color-cream)";
const DARK_TEXT = "var(--color-midnight)";
const MUTED     = "rgba(41,45,42,0.45)";

export function MenuSection() {
  const sectionRef      = useRef<HTMLElement>(null);
  const titleWrapRef    = useRef<HTMLDivElement>(null);
  const titleScaleRef   = useRef<HTMLDivElement>(null);
  const eyebrowRef      = useRef<HTMLParagraphElement>(null);
  const ctaRef          = useRef<HTMLDivElement>(null);
  const galleryWrapRef  = useRef<HTMLDivElement>(null);
  const galleryTrackRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile]         = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (setter: (v: boolean) => void) => (e: MediaQueryList | MediaQueryListEvent) => setter((e as MediaQueryList).matches);
    setIsMobile(mq.matches);
    setReduceMotion(rm.matches);
    mq.addEventListener("change", update(setIsMobile));
    rm.addEventListener("change", update(setReduceMotion));
    return () => {
      mq.removeEventListener("change", update(setIsMobile));
      rm.removeEventListener("change", update(setReduceMotion));
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || isMobile || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      const p = CONFIG.phases;

      gsap.set(eyebrowRef.current,    { opacity: 0 });
      gsap.set(ctaRef.current,        { opacity: 0 });
      gsap.set(galleryWrapRef.current, {
        y: () => window.innerHeight * CONFIG.content.initialOffsetVh,
      });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger:             sectionRef.current,
          start:               "top top",
          end:                 () => `+=${window.innerHeight * CONFIG.pinDurationVh}`,
          pin:                 true,
          pinSpacing:          true,
          scrub:               CONFIG.scrub,
          invalidateOnRefresh: true,
        },
      });

      // Title group: translate up as a unit
      tl.to(titleWrapRef.current, {
        y:        () => -window.innerHeight * CONFIG.title.travelVh,
        ease:     CONFIG.title.ease,
        duration: p.titleEnd,
      }, 0);

      // Headline: scale down independently
      tl.to(titleScaleRef.current, {
        scale:    CONFIG.title.finalScale,
        ease:     CONFIG.title.ease,
        duration: p.titleEnd,
      }, 0);

      // Gallery rises from below into slot
      tl.fromTo(galleryWrapRef.current, {
        y: () => window.innerHeight * CONFIG.content.initialOffsetVh,
      }, {
        y:        0,
        ease:     CONFIG.content.ease,
        duration: p.galleryRiseEnd - p.galleryRiseStart,
      }, p.galleryRiseStart);

      // Eyebrow fades in
      tl.to(eyebrowRef.current, { opacity: 1, duration: 0.08 }, p.eyebrowStart);

      // CTA fades in
      tl.to(ctaRef.current, {
        opacity:  1,
        duration: p.ctaEnd - p.ctaStart,
      }, p.ctaStart);

      // Gallery scrolls left → right (track translates negative X)
      tl.fromTo(galleryTrackRef.current, {
        x: 0,
      }, {
        x:        () => -(galleryTrackRef.current!.scrollWidth - window.innerWidth),
        ease:     "none",
        duration: p.galleryScrollEnd - p.galleryScrollStart,
      }, p.galleryScrollStart);

    }, sectionRef);

    return () => ctx.revert();
  }, [reduceMotion, isMobile]);

  // ── Mobile / reduced-motion: static layout with native scroll gallery ───
  if (reduceMotion || isMobile) {
    return (
      <section
        className="relative w-full overflow-hidden"
        style={{ backgroundColor: LIGHT_BG, color: DARK_TEXT }}
      >
        <div className="pt-20 pb-10">
          <div className="px-section-x mb-8">
            <p style={{
              fontFamily:    "var(--font-body)",
              fontWeight:    300,
              fontSize:      "0.7rem",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color:         MUTED,
              marginBottom:  "0.75rem",
            }}>
              Our Menu
            </p>
            <h2 style={{
              fontFamily:    "var(--font-display)",
              fontWeight:    400,
              fontSize:      "clamp(2.2rem, 7vw, 4rem)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color:         DARK_TEXT,
              lineHeight:    1.05,
              marginBottom:  "2rem",
            }}>
              Made Fresh,<br />Every Single Time.
            </h2>
            <Link
              href="/order"
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                gap:            "0.5rem",
                fontFamily:     "var(--font-body)",
                fontWeight:     300,
                fontSize:       "0.72rem",
                letterSpacing:  "0.22em",
                textTransform:  "uppercase",
                padding:        "0.75rem 1.75rem",
                border:         `0.5px solid rgba(41,45,42,0.30)`,
                textDecoration: "none",
                color:          DARK_TEXT,
              }}
            >
              Order Now →
            </Link>
          </div>

          {/* Native horizontal scroll gallery */}
          <div style={{ overflowX: "auto", scrollbarWidth: "none" }}>
            <div style={{ display: "flex", gap: "6px", paddingLeft: "1px" }}>
              {GALLERY_IMAGES.map((img, i) => (
                <div
                  key={i}
                  style={{
                    position:    "relative",
                    flexShrink:  0,
                    height:      "62vw",
                    aspectRatio: "2 / 3",
                  }}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover"
                    sizes="50vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Animated desktop layout ──────────────────────────────────────────────
  return (
    <section
      ref={sectionRef}
      style={{
        position:        "relative",
        height:          "100vh",
        overflow:        "hidden",
        backgroundColor: LIGHT_BG,
        color:           DARK_TEXT,
      }}
      aria-label="Our Menu — Made Fresh, Every Single Time"
    >
      <div style={{ position: "relative", height: "100%", width: "100%" }}>

        {/* ── Title group: translates as a unit; only headline scales ─────── */}
        <div
          ref={titleWrapRef}
          style={{
            position:       "absolute",
            inset:          0,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            zIndex:         10,
            pointerEvents:  "none",
            willChange:     "transform",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

            {/* Scale wrapper: only headline + eyebrow shrink */}
            <div ref={titleScaleRef} style={{ position: "relative", willChange: "transform" }}>
              <p
                ref={eyebrowRef}
                style={{
                  position:      "absolute",
                  top:           "-1.75rem",
                  left:          "50%",
                  transform:     "translateX(-50%)",
                  whiteSpace:    "nowrap",
                  fontFamily:    "var(--font-body)",
                  fontWeight:    300,
                  fontSize:      "0.7rem",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color:         MUTED,
                  opacity:       0,
                  willChange:    "opacity",
                }}
              >
                Our Menu
              </p>
              <h2
                style={{
                  fontFamily:    "var(--font-display)",
                  fontWeight:    400,
                  fontSize:      "clamp(1.5rem, 5vw, 5.5rem)",
                  letterSpacing: "0.08em",
                  lineHeight:    1.05,
                  whiteSpace:    "nowrap",
                  textAlign:     "center",
                  textTransform: "uppercase",
                  color:         DARK_TEXT,
                }}
              >
                Made Fresh, Every Single Time.
              </h2>
            </div>

            {/* CTA — sibling of scale wrapper, rides translate but never shrinks */}
            <div
              ref={ctaRef}
              style={{
                marginTop:     "0.75rem",
                pointerEvents: "auto",
                opacity:       0,
                willChange:    "opacity",
              }}
            >
              <Link
                href="/order"
                style={{
                  display:        "inline-flex",
                  alignItems:     "center",
                  gap:            "0.5rem",
                  fontFamily:     "var(--font-body)",
                  fontWeight:     300,
                  fontSize:       "0.72rem",
                  letterSpacing:  "0.22em",
                  textTransform:  "uppercase",
                  padding:        "0.75rem 1.75rem",
                  border:         `0.5px solid rgba(41,45,42,0.30)`,
                  textDecoration: "none",
                  color:          DARK_TEXT,
                  transition:     "border-color 0.3s",
                }}
              >
                Order Now →
              </Link>
            </div>
          </div>
        </div>

        {/* ── Gallery: clips overflow; track scrolls horizontally ──────────── */}
        <div
          ref={galleryWrapRef}
          style={{
            position:  "absolute",
            top:       CONFIG.slot.top,
            bottom:    CONFIG.slot.bottom,
            left:      0,
            right:     0,
            overflow:  "hidden",
            willChange: "transform",
          }}
        >
          <div
            ref={galleryTrackRef}
            style={{
              display:   "flex",
              height:    "100%",
              gap:       "6px",
              willChange: "transform",
            }}
          >
            {GALLERY_IMAGES.map((img, i) => (
              <div
                key={i}
                style={{
                  position:    "relative",
                  flexShrink:  0,
                  height:      "100%",
                  aspectRatio: "2 / 3",
                }}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1280px) 30vw, 400px"
                />
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
