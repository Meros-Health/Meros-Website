"use client";

import { useRef } from "react";
import { CTAButton } from "@/components/ui/CTAButton";
import { SignatureGallery } from "@/components/gallery/SignatureGallery";
import { Reveal } from "@/components/ui/ScrollReveal";
import { useRevealReady } from "@/lib/useRevealReady";
import { HOME_MENU_ROWS } from "@/lib/menu/menuGallery";
import { bowlPriceSummary } from "@/lib/menu/pricing";
import { listBowls, listSmoothies } from "@/lib/menu/signatures";

// The home page's menu section: a header, the same gallery wall /menu is built
// from showing the four bestsellers, then a cream bar that hands off to the
// builder section below it.
//
// It replaced a sticky image stage beside a scrolling ledger of all ten
// signatures. Two reasons. The wall is the layout the rest of the site now
// uses, and reprinting the whole menu here made /menu a page with nothing on it
// the home page had not already shown.
//
// The way to the full menu is stated twice, above the wall and again in the bar
// below it. Four items is exactly enough to be mistaken for the whole menu, and
// the bar is the last thing read before the section ends, which is where that
// misreading would otherwise stick.
//
// Both are the outlined variant, the same one BuildSection's button uses. They
// were grapefruit fills. Two loud buttons on one cream screen compete for the
// same click, and the one in the bar sits a few lines from COMPOSE YOUR OWN's
// button, where a filled button and an outlined one would have implied a
// ranking between two routes that are meant to be a genuine either/or.
//
// Rows are shorter than /menu's: a full menu row is sized to hold an
// eight-ingredient recipe with room around it, and three of those under a hero
// is most of a screen each.
const ROW_HEIGHT = "clamp(21rem, 36vw, 34rem)";

export function SignatureMenuSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const show = useRevealReady(headerRef, "-120px");

  return (
    <section className="relative w-full bg-cream overflow-x-clip">
      <div ref={headerRef} className="px-section-x pt-section pb-14">
        <Reveal show={show} index={0}>
          <h2
            className="font-headline text-midnight tracking-headline leading-[0.9] uppercase"
            style={{ fontSize: "clamp(2.25rem, 7vw, 4.75rem)" }}
          >
            Our Favourites
          </h2>
        </Reveal>

        <Reveal show={show} index={1}>
          {/* Derived from menu.json, so a price change on the board reaches
              this sentence without anyone editing it. */}
          <p className="font-body-mixed text-juniper text-sm leading-relaxed mt-5">
            {bowlPriceSummary()}
          </p>
        </Reveal>

        <Reveal show={show} index={2}>
          <CTAButton href="/menu" variant="dark" className="mt-8">
            See the full menu
          </CTAButton>
        </Reveal>
      </div>

      <SignatureGallery rows={HOME_MENU_ROWS} rowHeight={ROW_HEIGHT} />

      <FullMenuBar />
    </section>
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
          Browse the full menu
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
        <CTAButton href="/menu" variant="dark" className="mt-7">
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
