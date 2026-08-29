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
import { GallerySection } from "@/components/sections/GallerySection";
import { BuildSection } from "@/components/sections/BuildSection";
import { StacksSection } from "@/components/sections/StacksSection";
import { SectionBand } from "@/components/ui/SectionBand";

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
      <div id="hero">
        <HeroSection />
      </div>

      <SectionBand>{"A DAY'S FUEL, DEFINED BY YOU"}</SectionBand>

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

      <div id="gallery">
        <GallerySection />
      </div>
    </main>
  );
}
