import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";
import { breadcrumbSchema } from "@/lib/business";
import { JsonLd } from "@/components/seo/JsonLd";
import { SignatureList } from "@/components/menu/SignatureList";
import { EntranceReveal } from "@/components/transition/EntranceReveal";
import { CategoryHeading } from "@/components/gallery/CategoryHeading";
import { listBowls, listSmoothies } from "@/lib/menu/signatures";

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
