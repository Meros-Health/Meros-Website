"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { SignatureItem } from "@/lib/menu/signatures";

// What stands in for the picture on a signature that ships without one (The
// Seasonal, whose fruit changes with the season): a card in the Our Story
// house style. The front is a darkened photograph with the season's fruit set
// over it above a cream footer; clicking turns it to a back that says why the
// bowl exists at all.
//
// The style is COPIED from components/sections/OurStorySection.tsx, not
// imported. FanCard is welded to that section's fan deck (shared pivot
// rotation, per-click split geometry, z-order rules), none of which applies to
// one tile in a product grid. What is copied deliberately:
//
//   - the cream face and the 0 30px 60px rgba(41,45,42,0.18) shadow
//   - a photograph over a cream footer bar, footer type font-body-caps at 10px
//   - the -8px desktop hover lift, 0.7s power3.out
//   - click to turn, 0.8s power2.inOut out and 0.6s back
//   - the back's layout: label row, headline, body, fact line, close button
//   - and the reason that file is built the way it is: THE CARD IS FLAT AT
//     REST. perspective, preserve-3d and backface-visibility go on only for
//     the duration of a turn and come off once it lands. Left on, every face
//     becomes a composited layer that the browser rasterises axis-aligned then
//     resamples, which softens the text and the photograph, and in WebKit the
//     hidden back bleeds through mirrored. Do not "simplify" that away.
//
// This is the only slot this file fills. /order and the ledger thumbnail
// (components/sections/SignatureMenuSection.tsx, app/order/page.tsx) used to
// reuse it for a plain photograph in the image well ("card" and "thumb"
// variants), standing in a generic gallery shot where the item's own photo
// would go. As of 2026-09-01 both surfaces render no image region at all for
// an item without photography instead, so this file only ever renders the
// homepage sticky stage's turning card.

const PHOTO = "/images-web/Gallery/Gallery-6.jpg";

const CARD_SHADOW = "0 30px 60px rgba(41,45,42,0.18)";
const CARD_PERSPECTIVE = 1400; // px, on the wrapper, during the turn only
const HOVER_LIFT = -8;         // px, desktop hover
const HOVER_DURATION = 0.7;
const HOVER_EASE = "power3.out";
const FLIP_DURATION = 0.8;
const CLOSE_FLIP_DURATION = 0.6;
const FLIP_EASE = "power2.inOut";

// The footer bar as a share of the card's own width. Our Story runs 52px on a
// 200-260px card and 60px on a 200-320px one; this lands in the same band at
// every width this tile is rendered at.
const FOOT = "clamp(38px, 12cqw, 60px)";

// Gallery-6 is a bright, high-key overhead spread, so cream type over it needs
// a real scrim, not a wash. At 64% the composite sits near #666763, putting
// cream past AA for small text, never mind the large line it carries. The
// fruit still reads through; below about 55% the cream starts to swim.
const SCRIM = "color-mix(in srgb, var(--color-midnight) 64%, transparent)";

/**
 * Share of the stage square the card occupies. The stage's neighbours are
 * transparent bowl cutouts floating on cream, so the card is inset: enough to
 * stop it dwarfing them, and enough room under it for the drop shadow.
 */
const STAGE_SCALE = "88%";

const DEFAULT_NOTE = "what is in season";

// Why the bowl exists. It lives here rather than in menu.json because it is
// evergreen: menu.json carries the part that changes (`seasonNote`).
const BACK = {
  headline: "Built around what's ripe.",
  body:
    "Stone fruit and berries are only good for a few weeks each, not all year. So one bowl on the menu stays open, and we fill it with whatever is actually in season. Everything under the fruit stays the same.",
  fact: "Ask what's in the case today.",
};

function seasonNote(item: SignatureItem): string {
  return item.seasonNote?.trim() || DEFAULT_NOTE;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function SignatureTile({
  item,
  active = true,
}: {
  item: SignatureItem;
  /** False while another item is showing, which resets the turn. */
  active?: boolean;
}) {
  return <SeasonalCard item={item} active={active} />;
}

function SeasonalCard({ item, active }: { item: SignatureItem; active: boolean }) {
  const note = seasonNote(item);
  const scope = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const flipper = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLButtonElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const backId = `signature-tile-back-${item.id}`;
  const headingId = `${backId}-heading`;

  const { contextSafe } = useGSAP({ scope });

  // The 3D context, on only while the card turns. See the note at the top.
  const set3D = useCallback((on: boolean) => {
    wrapper.current?.style.setProperty("perspective", on ? `${CARD_PERSPECTIVE}px` : "");
    flipper.current?.style.setProperty("transform-style", on ? "preserve-3d" : "");
    for (const face of [front.current, back.current]) {
      face?.style.setProperty("backface-visibility", on ? "hidden" : "");
      face?.style.setProperty("-webkit-backface-visibility", on ? "hidden" : "");
    }
  }, []);

  // Land flat: no 3D transform survives at rest, and the face that is not
  // showing is hidden outright rather than merely turned away.
  const rest = useCallback((showBack: boolean) => {
    gsap.set(flipper.current, { rotationY: 0 });
    gsap.set(back.current, { rotationY: 0, visibility: showBack ? "inherit" : "hidden" });
    gsap.set(front.current, { visibility: showBack ? "hidden" : "inherit" });
    set3D(false);
  }, [set3D]);

  const toggle = contextSafe(() => {
    const showBack = !open;
    setOpen(showBack);

    if (prefersReducedMotion()) {
      rest(showBack);
      return;
    }

    // Arm: both faces one-sided, the back waiting behind the front.
    set3D(true);
    gsap.set(front.current, { visibility: "inherit" });
    gsap.set(back.current, { visibility: "inherit", rotationY: 180 });
    gsap.set(flipper.current, { rotationY: showBack ? 0 : 180 });
    if (showBack) gsap.set(wrapper.current, { y: 0 }); // drop any hover lift

    gsap.to(flipper.current, {
      rotationY: showBack ? 180 : 0,
      duration: showBack ? FLIP_DURATION : CLOSE_FLIP_DURATION,
      ease: FLIP_EASE,
      overwrite: "auto",
      onComplete: () => rest(showBack),
    });
  });

  const hover = contextSafe((entering: boolean) => {
    if (open || prefersReducedMotion()) return;
    gsap.to(wrapper.current, { y: entering ? HOVER_LIFT : 0, duration: HOVER_DURATION, ease: HOVER_EASE });
  });

  // Escape closes, matching Our Story.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") toggle(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, toggle]);

  // Stage only: a cross-fade to another item must not leave this one turned.
  useEffect(() => {
    if (active || !open) return;
    setOpen(false);
    rest(false);
    gsap.set(wrapper.current, { y: 0 });
  }, [active, open, rest]);

  return (
    <div ref={scope} data-signature-tile="stage" className="flex h-full w-full items-center justify-center">
      <div ref={wrapper} className="relative" style={{ width: STAGE_SCALE, aspectRatio: "1" }}>
        <div ref={flipper} className="relative h-full w-full">
          {/* FRONT */}
          <button
            ref={front}
            type="button"
            aria-expanded={open}
            aria-controls={backId}
            onClick={toggle}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") hover(true); }}
            onPointerLeave={(e) => { if (e.pointerType === "mouse") hover(false); }}
            className="absolute inset-0 flex cursor-pointer flex-col border-0 bg-cream p-0 text-left"
            style={{ boxShadow: CARD_SHADOW, containerType: "inline-size" }}
          >
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <Image
                src={PHOTO}
                alt={`${item.name}: ${note}`}
                fill
                sizes="(min-width: 1024px) 40vw, 92vw"
                style={{ objectFit: "cover" }}
              />
              <div className="absolute inset-0" style={{ background: SCRIM }} aria-hidden />
              <div className="absolute inset-0 flex items-center justify-center" style={{ padding: "8cqw" }}>
                <span
                  className="font-aetheria text-center text-cream"
                  style={{ fontSize: "clamp(1rem, 7cqw, 2.25rem)", lineHeight: 1.25, maxWidth: "16ch" }}
                >
                  Featuring {note}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-center" style={{ height: FOOT }}>
              <span className="font-body-caps text-[10px] text-midnight">In Season</span>
            </div>
          </button>

          {/* BACK: hidden at rest; a turn pre-rotates it 180deg so the turn
              reveals it. visibility is GSAP-owned after mount, so React must
              not rewrite it on re-render. */}
          <div
            ref={back}
            id={backId}
            role="region"
            aria-labelledby={headingId}
            aria-hidden={!open}
            onClick={() => { if (open) toggle(); }}
            className="absolute inset-0 flex flex-col overflow-hidden bg-cream text-midnight"
            style={{
              padding: "clamp(14px, 7cqw, 22px)",
              boxShadow: CARD_SHADOW,
              visibility: "hidden",
              containerType: "inline-size",
              pointerEvents: open ? "auto" : "none",
            }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={(e) => { e.stopPropagation(); toggle(); }}
              className="absolute right-0 top-0 flex h-11 w-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-midnight/70 hover:text-midnight"
            >
              <CloseIcon />
            </button>
            <span className="shrink-0 pr-10 font-body-caps text-[10px]">In Season</span>
            {/* Our Story's back is a portrait card its body nearly fills. This
                slot is square and much taller for the same words, so the mass
                is centred in the space left between the label and the fact
                line rather than top-anchored against a void. */}
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
              <h3
                id={headingId}
                className="font-headline leading-[1.1]"
                style={{ fontSize: "clamp(0.95rem, 6.8cqw, 2.25rem)" }}
              >
                {BACK.headline}
              </h3>
              <p
                className="font-body-mixed text-midnight/70"
                style={{ fontSize: "clamp(11px, 4.6cqw, 20px)", lineHeight: 1.55 }}
              >
                {BACK.body}
              </p>
            </div>
            <span className="shrink-0 pt-2 font-body-caps text-[10px] leading-relaxed text-midnight/60">
              {BACK.fact}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
