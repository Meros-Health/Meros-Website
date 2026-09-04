"use client";

import Image from "next/image";
import type { GalleryPanel, GalleryRow, GalleryTone } from "@/lib/gallery/types";

// Renders a wall of rows. Owns column spans, row height and the collapse to a
// single column, and nothing else: what goes inside a text panel is the
// caller's business, passed in as `renderText`.
//
// The shape rules live in app/globals.css under "Gallery wall", because the
// collapse is a container query and the panel type scale is driven by each
// panel's own width. There is no viewport media query anywhere in this feature,
// which is what lets the same wall sit full-bleed on /menu and inside a
// narrower slot on another page without a second set of breakpoints.

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

function Panel({ panel, renderText }: { panel: GalleryPanel; renderText: GalleryWallProps["renderText"] }) {
  const style = { gridColumn: `span ${panel.span}` } as React.CSSProperties;

  if (panel.kind === "image") {
    const crop = panel.crop;

    return (
      <div className="gallery-panel gallery-panel-image" style={style}>
        <Image
          src={panel.src}
          alt={panel.alt}
          fill
          // The panel is a fraction of the viewport, and which fraction depends
          // on the row. This is the widest any panel gets, rounded up: an
          // over-estimate costs bytes, an under-estimate costs a blurry photo.
          // A cropped panel spends its pixels on part of the photo, so it asks
          // for a wider source than the panel it is drawn in.
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
    );
  }

  return (
    <article className={`gallery-panel gallery-panel-text gallery-tone-${panel.tone}`} style={style}>
      {renderText(panel.id, panel.tone)}
    </article>
  );
}

export function GalleryWall({ rows, renderText, rowHeight, className = "" }: GalleryWallProps) {
  return (
    <div
      className={`gallery ${className}`.trim()}
      style={rowHeight ? ({ "--gallery-row-height": rowHeight } as React.CSSProperties) : undefined}
    >
      {rows.map((row) => (
        <div key={row.id} className="gallery-row">
          {row.panels.map((panel, i) => (
            <Panel key={panel.kind === "image" ? panel.src : `${panel.id}-${i}`} panel={panel} renderText={renderText} />
          ))}
        </div>
      ))}
    </div>
  );
}
