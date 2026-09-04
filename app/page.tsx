import { OG_IMAGE, pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";
import { restaurantSchema } from "@/lib/business";
import { JsonLd } from "@/components/seo/JsonLd";
import { HeroSection } from "@/components/sections/HeroSection";
import { SignatureMenuSection } from "@/components/sections/SignatureMenuSection";
import { OurStorySection } from "@/components/sections/OurStorySection";
// Disabled: the Featured Pairing section is kept in the codebase but not rendered.
// The import stays commented out so PairingsSection and its assets are excluded
// from the bundle. Restore this line and the <div id="pairs"> block below to re-enable.
// import { PairingsSection } from "@/components/sections/PairingsSection";
import { HomeGallerySection } from "@/components/sections/HomeGallerySection";
import { BuildSection } from "@/components/sections/BuildSection";
import { StacksSection } from "@/components/sections/StacksSection";

export const metadata = pageMetadata({
  title: "MERŌS - House of Yogurt",
  description: "Greek yogurt bowls and smoothies, strained and built in-house. Yaletown, Vancouver.",
  path: "/",
});

export default function HomePage() {
  return (
    <main className="overflow-x-clip">
      {/* The store as structured data: what produces the map card, hours and
          knowledge panel in search. Built from the same lib/business.ts the
          footer renders from. */}
      <JsonLd data={restaurantSchema(SITE_URL, "/icons/icon-512.png", OG_IMAGE.url)} />
      {/* Three panels, 150svh: the lockup, the image band, and "A day's fuel,
          defined by you" over a second photograph. That line used to be a
          cream SectionBand sitting here between the hero and the menu; it
          reads as part of the opening, not as a divider, so it moved inside.
          The menu section's own title now follows the hero directly. */}
      <div id="hero">
        <HeroSection />
      </div>

      <div id="menu">
        <SignatureMenuSection />
      </div>

      <div id="build">
        <BuildSection />
      </div>

      <div id="stacks">
        <StacksSection />
      </div>

      {/* Disabled: Featured Pairing section (see commented import above).
      <div id="pairs">
        <PairingsSection />
      </div>
      */}

      <div id="about">
        <OurStorySection />
      </div>

      {/* The closing wall: the same GalleryWall /menu is built from, fed the
          four places a visitor can go next. Two photographs with a button each
          over a row of type, so the menu and the builder are shown and catering
          and the store, which have never been shot, are named. */}
      <div id="gallery">
        <HomeGallerySection />
      </div>
    </main>
  );
}
