import { pageMetadata } from "@/lib/seo";
import { HeroSection } from "@/components/sections/HeroSection";
import { SignatureMenuSection } from "@/components/sections/SignatureMenuSection";
import { OurStorySection } from "@/components/sections/OurStorySection";
// Disabled: the Featured Pairing section is kept in the codebase but not rendered.
// The import stays commented out so PairingsSection and its assets are excluded
// from the bundle. Restore this line and the <div id="pairs"> block below to re-enable.
// import { PairingsSection } from "@/components/sections/PairingsSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { BuildSection } from "@/components/sections/BuildSection";
import { SectionBand } from "@/components/ui/SectionBand";

export const metadata = pageMetadata({
  title: "MERŌS - House of Yogurt",
  description: "Greek yogurt bowls and smoothies, strained and built in-house. Yaletown, Vancouver.",
  path: "/",
});

export default function HomePage() {
  return (
    <main className="overflow-x-clip">
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
