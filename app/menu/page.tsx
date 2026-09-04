import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";
import { breadcrumbSchema } from "@/lib/business";
import { JsonLd } from "@/components/seo/JsonLd";
import { BOWL_ROWS, SMOOTHIE_ROWS } from "@/lib/menu/menuGallery";
import { SignatureGallery } from "@/components/gallery/SignatureGallery";
import { EntranceReveal } from "@/components/transition/EntranceReveal";
import { CategoryHeading } from "@/components/gallery/CategoryHeading";

// The whole menu, as two gallery walls. Which items appear as a photograph and
// which as type is the wall's business (lib/menu/menuGallery.ts); what a panel
// says is SignatureItemPanel's.
//
// Two old paths 308 here: /our-menu from the agency site, and /order, which
// this page answered from the cutover until 2026-09-03. The title stays "Our
// Menu" because that is what /our-menu ranked for; the rename was about the
// path, not the page.
//
// This is a server component, so the metadata lives here. It needed a layout.tsx
// to hold it back when the page was "use client"; the client boundary is now
// SignatureGallery, several levels down, so that file is gone.

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
      <section className="px-section-x-fluid pt-36 pb-4">
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

      <section id="bowls">
        <CategoryHeading title="Signature Bowls" category="bowl" />
        <SignatureGallery rows={BOWL_ROWS} />
      </section>

      <section id="smoothies">
        <CategoryHeading title="Signature Smoothies" category="smoothie" />
        <SignatureGallery rows={SMOOTHIE_ROWS} />
      </section>
    </main>
  );
}
