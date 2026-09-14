import { OG_IMAGE, pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/config";
import { restaurantSchema } from "@/lib/business";
import { JsonLd } from "@/components/seo/JsonLd";
import { HeroSection } from "@/components/sections/HeroSection";
import { SignatureMenuSection } from "@/components/sections/SignatureMenuSection";
import { OurStorySection } from "@/components/sections/OurStorySection";
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
      {/* One full-screen panel, held in place while the page is pulled over
          it. The wrapper carries the hold distance and the hero is sticky
          inside it; see .hero-curtain in app/globals.css for the geometry. */}
      <div id="hero" className="hero-curtain">
        <HeroSection />
      </div>

      {/* The sheet. Positioned so it paints above the sticky hero; the
          section's own cream background is what covers the photograph. */}
      <div id="menu" className="relative">
        <SignatureMenuSection />
      </div>

      <div id="build">
        <BuildSection />
      </div>

      <div id="stacks">
        <StacksSection />
      </div>

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
