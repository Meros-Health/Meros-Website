import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";
import { breadcrumbSchema } from "@/lib/business";
import { JsonLd } from "@/components/seo/JsonLd";
import { SignatureList } from "@/components/menu/SignatureList";
import { EntranceReveal } from "@/components/transition/EntranceReveal";
import { CategoryHeading } from "@/components/gallery/CategoryHeading";
import { listBowls, listSmoothies } from "@/lib/menu/signatures";
import { CTAButton } from "@/components/ui/CTAButton";
import { UBER_EATS_URL } from "@/lib/business";

// The whole menu, as two lists with a product photo on every item. What an
// item says and how it adds is SignatureList's; this page only sets the
// order and the headings. It replaced the gallery walls on 2026-09-10, when
// the Uber Eats shoot gave every item one photograph and the wall's rows had
// nothing else left to hold.
//
// Two old paths 308 here: /our-menu from the agency site, and /order, which
// this page answered from the cutover until 2026-09-03. The title stays "Our
// Menu" because that is what /our-menu ranked for; the rename was about the
// path, not the page.
//
// This is a server component, so the metadata lives here. The client boundary
// is SignatureList.

export const metadata = pageMetadata({
  title: "Our Menu - MERŌS",
  description: "Signature bowls and smoothies, strained and built in-house. Yaletown, Vancouver.",
  path: "/menu",
});

export default function MenuPage() {
  return (
    <main>
      <JsonLd data={breadcrumbSchema(SITE_URL, "Our Menu", "/menu")} />

      {/* Page title: the top of the page every fresh load lands on. */}
      <section className="px-section-x pt-36 pb-4">
        <EntranceReveal index={0}>
          <h1
            className="font-headline text-midnight leading-[0.9] uppercase"
            style={{ fontSize: "clamp(3rem, 7vw, 6rem)" }}
          >
            Our Menu
          </h1>
        </EntranceReveal>
        <EntranceReveal index={1}>
          <p className="font-body-mixed text-sm text-juniper mt-4 max-w-md">
            Signature bowls and smoothies, strained and built in-house.
          </p>
        </EntranceReveal>

        {/* Delivery, stated at the top rather than at the bottom: someone who
            came here to order and is not in Yaletown should not have to read
            the whole menu before finding out the app carries it. Outlined and
            not filled, the same reasoning as everywhere else on the site: the
            filled button is for a route the site owns, and this one leaves it.

            Only the link is here. What Uber Eats sells and for how much is a
            different menu with the platform's commission in it, and printing
            those prices on a store surface would make the two disagree. */}
        <EntranceReveal index={2}>
          <div className="mt-8 flex flex-col items-start gap-4">
            <p className="font-body-mixed text-sm text-juniper max-w-md">
              We&rsquo;re on Uber Eats. Order delivery in the app on your phone, or on the web.
            </p>
            <CTAButton href={UBER_EATS_URL} variant="dark" target="_blank" rel="noopener noreferrer">
              Order on Uber Eats
            </CTAButton>
          </div>
        </EntranceReveal>
      </section>

      <section id="bowls" className="pb-section">
        <CategoryHeading title="Signature Bowls" category="bowl" />
        <div className="px-section-x">
          <SignatureList items={listBowls()} variant="cards" photos="all" mobileThumb="square" />
        </div>
      </section>

      <section id="smoothies" className="pb-section">
        <CategoryHeading title="Signature Smoothies" category="smoothie" />
        <div className="px-section-x">
          <SignatureList items={listSmoothies()} variant="cards" photos="all" mobileThumb="square" />
        </div>
      </section>
    </main>
  );
}
