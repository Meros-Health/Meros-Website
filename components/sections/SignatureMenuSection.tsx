"use client";

import Image from "next/image";
import { useRef } from "react";
import { CTAButton } from "@/components/ui/CTAButton";
import { SignatureList } from "@/components/menu/SignatureList";
import { Reveal } from "@/components/ui/ScrollReveal";
import { useRevealReady } from "@/lib/useRevealReady";
import { inStorePriceSummary, priceChannelNote, categoryPriceLine } from "@/lib/menu/pricing";
import { UBER_EATS_URL } from "@/lib/business";
import { listBowls, listSmoothies, type SignatureCategory, type SignatureItem } from "@/lib/menu/signatures";

// The home page's menu section: a header, the signature bowls and smoothies
// as two lists with a few photographs beside them, then a cream bar that
// hands off to the builder section below it.
//
// The lists replaced the gallery wall on 2026-09-10. The wall showed four
// bestsellers as rows of two photographs each, and after the menu changed
// only The Moment and The Silk still looked like their photographs. The list
// is the /source-menu shape: every item as type, one column, and the photos
// we have hung beside it with the item's name under each. The Uber Eats
// shoot supplies the four here (two bowls, two smoothies); on a phone the
// photos go and the two bowls with a matching top-down cut-out get a small
// thumbnail, so the section stays readable at one thumb's width.
//
// Every signature is listed, not a preview. /menu still earns its link: it
// carries a photograph of every item and room to read each one.
//
// The way to /menu is stated twice, above the lists and again in the bar
// below them. Both are the filled midnight variant, the same one
// BuildSection's button uses, because the bar's button has to match COMPOSE
// YOUR OWN's a few lines below it: a filled button and an outlined one would
// imply a ranking between two routes that are meant to be a genuine either/or.

// The items whose product photo hangs beside the list from tablet width up.
const HOME_PHOTOS: Record<SignatureCategory, readonly string[]> = {
  bowl: ["moment", "silk"],
  smoothie: ["glow", "cabana"],
};

/**
 * inStorePriceSummary() as one sentence about bowl sizes and, when the
 * smoothies agree on a price, a second about smoothies (" Smoothies, 22 oz,
 * $15."). On a phone the combined sentence is long enough to wrap mid clause,
 * right after "Smoothies," which reads worse than a clean break before it.
 * This forces that break below tablet width and lets the two sentences share
 * one line from tablet width up, same as before.
 */
function PriceSummary() {
  const summary = inStorePriceSummary();
  const split = summary.indexOf(" Smoothies");
  if (split === -1) return <>{summary}</>;

  return (
    <>
      {summary.slice(0, split)}
      <span className="block md:inline">{summary.slice(split)}</span>
    </>
  );
}

export function SignatureMenuSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const show = useRevealReady(headerRef, "-120px");

  return (
    <section className="relative w-full bg-cream overflow-x-clip">
      <div ref={headerRef} className="px-section-x pt-section pb-14 text-center">
        <Reveal show={show} index={0}>
          <h2
            className="font-headline text-midnight tracking-headline leading-[0.9] uppercase"
            style={{ fontSize: "clamp(2.25rem, 7vw, 4.75rem)" }}
          >
            Our Menu
          </h2>
        </Reveal>

        <Reveal show={show} index={1}>
          {/* Derived from menu.json, so a price change on the board reaches
              this sentence without anyone editing it. Split before "Smoothies"
              so a phone breaks the line there on purpose, rather than wherever
              it runs out of width mid clause.

              It names the channel ("In-store prices") because an Uber Eats
              button sits a few lines below and the platform charges more for
              the same bowl. */}
          <p className="font-body-mixed text-juniper text-sm leading-relaxed mt-5">
            <PriceSummary />
          </p>
        </Reveal>
      </div>

      <DeliveryNote />

      <Category title="Signature bowls" category="bowl" items={listBowls()} />
      <Category title="Signature smoothies" category="smoothie" items={listSmoothies()} />

      <FullMenuBar />
    </section>
  );
}

// Uber Eats, between the section header and the first category: the one place
// on the home page that says the menu can be had without coming to Yaletown.
//
// The button carries the sentence. It said "We're on Uber Eats. Order delivery
// in the app on your phone, or on the web." for one day, which is a line of
// marketing telling a reader what a button labelled ORDER ON UBER EATS has
// already told them. What the block does need is the price disclaimer, so the
// copy under it is the disclaimer and nothing else.
//
// Disclaimer under the button rather than over it: it qualifies the thing it
// follows, and set above the button it would read as the block's subtitle and
// put a caveat ahead of the offer. Smaller and quieter type than the header's
// price line for the same reason, so the eye takes it as a footnote to the
// button rather than as a second, competing statement of prices.
//
// Outlined, not filled. Browse and Compose Your Own further down are filled
// because they are the site's own routes; a filled button here would put a
// third party's app at the top of the section's hierarchy.
function DeliveryNote() {
  const ref = useRef<HTMLDivElement>(null);
  const show = useRevealReady(ref, "-80px");

  return (
    <div ref={ref} className="px-section-x pb-16 md:pb-20 flex flex-col items-center text-center">
      <Reveal show={show} index={0}>
        <CTAButton
          href={UBER_EATS_URL}
          variant="dark"
          target="_blank"
          rel="noopener noreferrer"
        >
          Order on Uber Eats
        </CTAButton>
      </Reveal>
      <Reveal show={show} index={1}>
        <p className="font-body-mixed text-juniper text-label leading-relaxed mt-4">
          {priceChannelNote()}
        </p>
      </Reveal>
    </div>
  );
}

// One category: its name and price on a line, then the list. The price is
// stated here once rather than on every item (categoryPriceLine returns
// undefined the moment the items stop agreeing, and a unit test fails on
// that too). The heading is left-set with the list under it, unlike the
// centred section header above: it is the start of a column, not a caption.
//
// Below tablet width, the bold rule under the heading is bowls-only: it
// stands in for the pictured column that only exists from tablet width up
// (MobilePicturedRow), so a phone gets the same two subtitled photographs as
// desktop instead of a line with nothing under it. Smoothies have no photo
// pairing on this page and keep the rule.
function Category({
  title,
  category,
  items,
}: {
  title: string;
  category: SignatureCategory;
  items: readonly SignatureItem[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const show = useRevealReady(ref, "-80px");
  const price = categoryPriceLine(category);
  const photos = HOME_PHOTOS[category];
  const pictured = items.filter((item) => item.images?.transparent && photos.includes(item.id));
  const mobilePictured = category === "bowl" && pictured.length > 0;

  return (
    <div ref={ref} className="px-section-x pb-16 md:pb-20">
      <Reveal show={show} index={0}>
        <div
          className={`flex flex-wrap items-baseline gap-x-6 gap-y-1 pb-3 mb-6 ${
            mobilePictured ? "md:border-b-2 md:border-midnight" : "border-b-2 border-midnight"
          }`}
        >
          <h3
            className="font-headline text-midnight uppercase leading-none"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}
          >
            {title}
          </h3>
          {price && <p className="font-body-caps text-juniper tracking-headline text-caption">{price}</p>}
        </div>
      </Reveal>

      {mobilePictured && <MobilePicturedRow items={pictured} />}

      <SignatureList
        items={items}
        variant="list"
        photos={photos}
        mobileThumb="none"
        bestSellers={category === "bowl" ? photos : undefined}
      />
    </div>
  );
}

/**
 * Below tablet width only: the pictured items side by side, each subtitled
 * with its name, exactly as the desktop column already subtitles them
 * (Figure's caption). Takes the rule's place under the heading rather than
 * sitting alongside it, so the heading area stays a single closing line at
 * every width.
 */
function MobilePicturedRow({ items }: { items: readonly SignatureItem[] }) {
  return (
    <div className="md:hidden grid grid-cols-2 gap-6 mb-8">
      {items.map((item) => (
        <figure key={item.id} className="flex flex-col items-center text-center">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
            <Image
              src={item.images!.transparent!}
              alt={item.name}
              fill
              sizes="45vw"
              className="object-cover object-center"
            />
          </div>
          <figcaption className="font-body-caps text-midnight tracking-headline mt-3 text-label uppercase">
            {item.name}
          </figcaption>
          <p className="font-body-caps text-grapefruit-text tracking-headline mt-1 text-label uppercase">
            Best Seller
          </p>
        </figure>
      ))}
    </div>
  );
}

// The wall's cream panel, run the full width of the page: the section's closing
// block and the hinge into the one after it. It borrows gallery-tone-cream for
// the light ground and the wall's own type scale for its type, so a change to
// either reaches this too. It sits on the same cream as the header above the
// wall and as the builder section below, so the three read as one ground.
//
// The shape is a choice, not a summary: the full menu stated with its own
// heading, subline and button, then "or", and then the next section's own
// heading answers it with "Compose Your Own". The rule is that the hinge only
// works if it stays incomplete. The bar names one option and stops mid
// sentence; BuildSection finishes it. That is also why the bottom padding is
// roughly half the top: the block leans toward what follows rather than
// closing the section.
//
// The subline counts real signatures out of menu.json rather than saying
// "more", so pulling an item off the board corrects this sentence too.
//
// Centred, and on the site's section inset rather than the wall's. Alignment
// and inset go together: a block set against the wall's leading edge wants the
// wall's narrow --gallery-pad, and a centred block wants room on both sides,
// which is what px-section-x is.
//
// It is a container so the wall's cqw type scale has a width to measure. The
// scale resolves against .gallery-row on the wall itself, and this bar is not
// in one; without a container of its own these values would silently fall back
// to the viewport, which is close to right here only because the bar happens to
// be full-bleed. Declaring it means the bar is still correct in a narrower slot.
function FullMenuBar() {
  const bowls = listBowls().length;
  const smoothies = listSmoothies().length;

  return (
    <div
      className="gallery-tone-cream w-full flex flex-col items-center text-center px-section-x"
      style={{
        containerType: "inline-size",
        borderTop: "var(--gallery-rule) solid var(--color-cream)",
        // Vertical room is the band's own, not the wall's. A wall panel is
        // centred in a row tall enough to hold a recipe; this one is only as
        // tall as it makes itself, so it sets the space it stands in.
        paddingTop: "clamp(2.75rem, 5vw, 4.5rem)",
        // Nothing below the hinge. The space under it is BuildSection's
        // SEAM_TOP, and the hinge sets its own space above, which is what puts
        // "or" between the two headings. Any padding here would push it off by
        // exactly that amount.
        paddingBottom: 0,
        background: "var(--color-cream)",
      }}
    >
      {/* The builder's title stack, repeated: heading, 1rem, subline, 1.75rem,
          button. Those two numbers are BuildSection's, not the wall's, because
          this block and COMPOSE YOUR OWN are read as a pair and a pair with two
          different internal rhythms reads as two unrelated blocks. */}
      <div className="flex flex-col items-center">
        <h3
          className="font-headline uppercase leading-[0.92]"
          style={{ fontSize: "var(--gallery-name-size)", color: "var(--gallery-ink)" }}
        >
          See the full menu
        </h3>

        <p
          className="font-body-mixed leading-relaxed"
          style={{
            marginTop: "1rem",
            fontSize: "var(--gallery-body-size)",
            color: "var(--gallery-ink-quiet)",
          }}
        >
          {bowls} signature bowls and {smoothies} smoothies, built to order.
        </p>

        {/* Byte for byte BuildSection's button apart from the label and the
            href. It used to carry the wall's panel metrics: container-relative
            padding, a 44px floor, and --gallery-cta-size on the label. Those
            exist so a button sitting inside a photograph's caption stays in
            proportion to its panel, and this one is not in a panel. Next to
            COMPOSE YOUR OWN's button it just read as a second, slightly
            different button, which is exactly what an either/or must not look
            like. Default metrics, so the two are the same object. */}
        <CTAButton href="/menu" variant="midnight" className="mt-7">
          Browse
        </CTAButton>
      </div>

      <OrHinge />
    </div>
  );
}

// "or", flanked by two hairlines, holding the seam between this section and the
// builder. Read aloud it is one word between two calls to action, which is what
// it is; the rules are decoration and are hidden from assistive tech.
//
// The rules are capped rather than run edge to edge. A full-width line would be
// a divider, and a divider says the section ended, which is the opposite of
// what this does. A short one reads as punctuation inside a sentence that
// continues past it.
//
// The top margin is the whole placement argument. The space below "or" is
// BuildSection's SEAM_TOP, a fixed clamp rather than a leftover, which is the
// only reason a margin here can be measured against anything. The two are
// within a couple of pixels of each other by eye at desktop widths, which is
// where this landed after being walked in from both ends: a wider seam read as
// two sections that happened to follow one another rather than one handing off
// to the next. Both sides scale off a clamp, so the balance holds at every
// width.
//
// Inline, and not the "section" token as a class. That token is registered
// under padding in the Tailwind config, not spacing, so pt-section exists and
// mt-section does not: written as a class it compiles to nothing and the word
// lands directly under the button. Padding is not an option here because the
// gap has to be outside the hairlines.
function OrHinge() {
  const rule = {
    flex: 1,
    height: "1px",
    background: "var(--rule-midnight)", // --color-midnight, at hairline weight
  } as const;

  return (
    <div
      className="flex w-full items-center"
      style={{
        maxWidth: "min(22rem, 70cqw)",
        gap: "clamp(0.75rem, 3cqw, 1.25rem)",
        marginTop: "clamp(2.25rem, 4.75vw, 4.75rem)",
      }}
    >
      <span aria-hidden style={rule} />
      <span
        className="font-body tracking-body-caps uppercase"
        style={{ fontSize: "0.6875rem", color: "var(--gallery-ink-quiet)" }}
      >
        or
      </span>
      <span aria-hidden style={rule} />
    </div>
  );
}
