import { HeroSection } from "@/components/sections/HeroSection";
import { SignatureMenuSection } from "@/components/sections/SignatureMenuSection";
import { OurStorySection } from "@/components/sections/OurStorySection";
import { PairingsSection } from "@/components/sections/PairingsSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { BuildSection } from "@/components/sections/BuildSection";
import { SectionBand } from "@/components/ui/SectionBand";

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

      <div id="pairs">
        <PairingsSection />
      </div>

      <div id="about">
        <OurStorySection />
      </div>

      <div id="gallery">
        <GallerySection />
      </div>
    </main>
  );
}
