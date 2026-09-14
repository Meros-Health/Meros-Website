"use client";

import Image from "next/image";
import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { GalleryPanel, GalleryRow, GalleryTone } from "@/lib/gallery/types";
import { CLIP_REVEAL_TIMING, REVEAL_REDUCED_S } from "@/lib/motion";
import { useRevealReady } from "@/lib/useRevealReady";

// Renders a wall of rows. Owns column spans, row height and the collapse to a
// single column, and nothing else: what goes inside a text panel is the
// caller's business, passed in as `renderText`.
//
// The shape rules live in app/globals.css under "Gallery wall", because the
// collapse is a container query and the panel type scale is driven by each
// panel's own width. There is no viewport media query anywhere in this feature,
// which is what lets the same wall sit full-bleed on /menu and inside a
// narrower slot on another page without a second set of breakpoints.
//
// The photographs hold still. They drifted sideways until 2026-09-08, one rate
// per row so the rows read as planes at different depths, and it came out
// because a wall is too many photographs to have in motion at once: fourteen
// on /menu, every one sliding in its frame, and the eye ends up tracking the
// sliding rather than reading the rows. The hero keeps a drift because it is
// one photograph and the only thing on its screen.

interface GalleryWallProps {
  rows: readonly GalleryRow[];
  /**
   * Draws a text panel's contents, keyed by the panel's `id`. The tone comes
   * with it because ink colour is handled by CSS variables but a button is
   * not: a dark-outline CTA on a midnight panel is invisible, so the renderer
   * has to know which ground it is standing on.
   */
  renderText: (id: string, tone: GalleryTone) => React.ReactNode;
  /**
   * Overrides --gallery-row-height for this wall. A full menu row is tall
   * enough to hold an eight-ingredient recipe; a wall used as a band inside a
   * longer page usually wants to be shorter than that.
   */
  rowHeight?: string;
  className?: string;
}

/**
 * A photograph in its panel. The panel clips; the layer inside it is the box
 * the photograph fills, and the thing a crop scales.
 */
function ImagePanel({ panel }: { panel: Extract<GalleryPanel, { kind: "image" }> }) {
  const crop = panel.crop;

  return (
    <div className="gallery-panel gallery-panel-image" style={{ gridColumn: `span ${panel.span}` }}>
      <div className="gallery-image-layer">
        <Image
          src={panel.src}
          alt={panel.alt}
          fill
          // The panel is a fraction of the viewport, and which fraction depends
          // on the row. This is the widest any panel gets, rounded up: an
          // over-estimate costs bytes, an under-estimate costs a blurry photo.
          // The widest panel is 10 of 24 columns, which is 42vw; collapsed, the
          // panel is the full width. A cropped panel spends its pixels on part
          // of the photo, so it asks for a wider source than the panel it is
          // drawn in.
          sizes={crop ? "(max-width: 900px) 100vw, 75vw" : "(max-width: 900px) 100vw, 50vw"}
          priority={panel.priority}
          className="object-cover object-center"
          // objectPosition anchors the cover crop and transformOrigin anchors
          // the zoom. They have to be the same point, or the subject slides.
          style={
            crop
              ? {
                  objectPosition: crop.focus,
                  transform: `scale(${crop.zoom})`,
                  transformOrigin: crop.focus,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

function TextPanel({
  panel,
  renderText,
}: {
  panel: Extract<GalleryPanel, { kind: "text" }>;
  renderText: GalleryWallProps["renderText"];
}) {
  return (
    <article
      className={`gallery-panel gallery-panel-text gallery-tone-${panel.tone}`}
      style={{ gridColumn: `span ${panel.span}` }}
    >
      {renderText(panel.id, panel.tone)}
    </article>
  );
}

function RowPanels({ row, renderText }: { row: GalleryRow; renderText: GalleryWallProps["renderText"] }) {
  return row.panels.map((panel, i) =>
    panel.kind === "image" ? (
      <ImagePanel key={panel.src} panel={panel} />
    ) : (
      <TextPanel key={`${panel.id}-${i}`} panel={panel} renderText={renderText} />
    )
  );
}

// Every row wipes in left to right as it is scrolled to, once its photographs
// have decoded, so the wipe never uncovers a half-painted picture. One wipe per
// row: the photograph and the text panel beside it arrive as one object rather
// than the type getting a beat of its own.
//
// The wipe is a cream curtain laid over the row and clipped away, not a clip on
// the row. The first version clipped the row itself and nothing ever appeared:
// an element under a zero-width clip-path never intersects the viewport as far
// as IntersectionObserver is concerned, so the gate never opened, and the
// browser's lazy loader reads the same geometry, so the photographs behind it
// were never even requested. The curtain leaves the row and its images exactly
// as they were; only the overlay animates. It is a CSS transition rather than
// a per-frame clip, so the row repaints for the 1.2s it takes and then never
// again. Reduced motion fades the curtain instead of wiping it.
function RevealRow({ row, renderText }: { row: GalleryRow; renderText: GalleryWallProps["renderText"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const show = useRevealReady(ref, "-80px");
  const reduced = useReducedMotion();

  const curtain: React.CSSProperties = reduced
    ? { opacity: show ? 0 : 1, transition: `opacity ${REVEAL_REDUCED_S}s linear` }
    : {
        // inset(top right bottom left): the left inset grows to the full
        // width, so the curtain's leading edge travels left to right.
        clipPath: show ? "inset(0 0 0 100%)" : "inset(0 0 0 0)",
        transition: `clip-path ${CLIP_REVEAL_TIMING}`,
      };

  return (
    <div ref={ref} className="gallery-row">
      <RowPanels row={row} renderText={renderText} />
      <div aria-hidden className="gallery-row-curtain" style={curtain} />
    </div>
  );
}

export function GalleryWall({ rows, renderText, rowHeight, className = "" }: GalleryWallProps) {
  return (
    <div
      className={`gallery ${className}`.trim()}
      style={rowHeight ? ({ "--gallery-row-height": rowHeight } as React.CSSProperties) : undefined}
    >
      {rows.map((row) => (
        <RevealRow key={row.id} row={row} renderText={renderText} />
      ))}
    </div>
  );
}
