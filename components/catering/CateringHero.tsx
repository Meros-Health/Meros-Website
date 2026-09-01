"use client";

import Image from "next/image";
import { EntranceReveal } from "@/components/transition/EntranceReveal";
import { CATERING_CONTACT, CATERING_HERO } from "@/lib/catering/content";
import { AnchorButton } from "@/components/catering/AnchorButton";

// Above the fold, so the reveal is gated on the page being ready
// (EntranceReveal) rather than on scrolling into view. Order follows the
// visual hierarchy: eyebrow, headline, lead, then the call to action.

const HERO_IMAGE = "/images-web/Bowls/Hand-Bowl-2.jpg";

export function CateringHero() {
  return (
    <section className="w-full bg-cream">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-section-x pt-32 pb-16 lg:flex-row lg:items-center lg:gap-16 lg:pt-40 lg:pb-24">
        <div className="flex min-w-0 flex-1 flex-col">
          <EntranceReveal index={0}>
            <span className="font-body-caps text-grapefruit-text text-[10px] tracking-[0.30em]">
              {CATERING_HERO.eyebrow}
            </span>
          </EntranceReveal>

          <EntranceReveal index={1}>
            <h1
              className="font-headline mt-5 uppercase leading-[0.92] text-midnight"
              style={{ fontSize: "clamp(2.75rem, 6.5vw, 6rem)" }}
            >
              {CATERING_HERO.title}
            </h1>
          </EntranceReveal>

          <EntranceReveal index={2}>
            <p className="font-body-mixed mt-7 max-w-xl text-midnight/75 leading-relaxed text-[0.95rem] sm:text-base">
              {CATERING_HERO.lead}
            </p>
          </EntranceReveal>

          {/* One call to action. Everything this page has to say is below the
              fold in reading order, so a second link that only scrolls one
              screen down would compete with the thing that starts an order. */}
          <EntranceReveal index={3}>
            <div className="mt-10">
              <AnchorButton href={`#${CATERING_CONTACT.inquiryAnchor}`} variant="filled">
                Start a catering order
              </AnchorButton>
            </div>
          </EntranceReveal>
        </div>

        {/* Fixed aspect at every breakpoint so the text column never reflows
            around a portrait/landscape swap. */}
        <EntranceReveal index={4} className="w-full min-w-0 lg:w-[42%]">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 5" }}>
            <Image
              src={HERO_IMAGE}
              alt="A MERŌS yogurt bowl held in one hand"
              fill
              sizes="(max-width: 1023px) 92vw, 42vw"
              priority
              className="object-cover object-center"
            />
          </div>
        </EntranceReveal>
      </div>
    </section>
  );
}
