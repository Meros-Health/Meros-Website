"use client";

import { CTAButton } from "@/components/ui/CTAButton";
import { GalleryWall } from "@/components/gallery/GalleryWall";
import { GalleryPromoBand } from "@/components/gallery/GalleryPromoBand";
import { HOME_ROWS, homePanel } from "@/lib/home/homeGallery";
import type { GalleryTone } from "@/lib/gallery/types";

// The home page's close: a band of two framed photographs, then a wall row of
// two panels of type. This file owns what a home panel says, and nothing about
// columns, heights or the collapse.
//
// Shorter than the menu's. A menu row has to hold an eight-ingredient recipe;
// these hold a sentence. Taller than the type strictly needs, though: the
// blocks are centred with nothing drawn around them, so the empty half of the
// row is doing the work a panel edge would otherwise do.
const ROW_HEIGHT = "clamp(17rem, 26vw, 26rem)";

function HomePanel({ id, tone }: { id: string; tone: GalleryTone }) {
  const panel = homePanel(id);

  return (
    <>
      <h2
        className="font-headline leading-[0.95] uppercase"
        style={{ fontSize: "var(--gallery-name-size)", color: "var(--gallery-ink)" }}
      >
        {panel.title}
      </h2>

      <p
        className="font-body-mixed leading-relaxed"
        style={{ fontSize: "var(--gallery-body-size)", color: "var(--gallery-ink-quiet)" }}
      >
        {panel.body}
      </p>

      {panel.detail && (
        <p
          className="font-body-caps tracking-headline"
          style={{ fontSize: "var(--gallery-tag-size)", color: "var(--gallery-ink-quiet)" }}
        >
          {panel.detail}
        </p>
      )}

      {/* The dark CTA is an outline on cream; the light one is a cream fill for
          a midnight panel. Tone and variant have to agree or the button
          disappears into its own ground. */}
      <CTAButton
        variant={tone === "midnight" ? "light" : "dark"}
        href={panel.cta.href}
        className="mt-1"
      >
        {panel.cta.label}
      </CTAButton>
    </>
  );
}

const renderHomePanel = (id: string, tone: GalleryTone) => <HomePanel id={id} tone={tone} />;

export function HomeGallerySection() {
  return (
    <>
      <GalleryPromoBand />
      {/* gallery-centered is what centres each block in its half and holds
          the two apart: both halves are cream with nothing drawn between them,
          so the space around the type is the only thing marking the boundary. */}
      <GalleryWall
        rows={HOME_ROWS}
        renderText={renderHomePanel}
        rowHeight={ROW_HEIGHT}
        className="gallery-centered"
      />
    </>
  );
}
