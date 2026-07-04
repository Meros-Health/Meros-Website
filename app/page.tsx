import { HeroSection } from "@/components/sections/HeroSection";
import { OurStorySection } from "@/components/sections/OurStorySection";
import { PairingsSection } from "@/components/sections/PairingsSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { BuildSection } from "@/components/sections/BuildSection";
import { SectionBand } from "@/components/ui/SectionBand";

export default function HomePage() {
  return (
    <main>
      <div id="hero">
        <HeroSection />
      </div>

      <SectionBand>A DAY'S FUEL, DEFINED BY YOU</SectionBand>

      <div id="gallery">
        <GallerySection />
      </div>

      <div id="pairs">
        <PairingsSection />
      </div>

      <div id="build">
        <BuildSection />
      </div>

      <div id="about">
        <OurStorySection />
      </div>

    </main>
  );
}
