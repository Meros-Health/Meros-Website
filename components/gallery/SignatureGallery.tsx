"use client";

import type { GalleryRow } from "@/lib/gallery/types";
import { GalleryWall } from "./GalleryWall";
import { SignatureItemPanel } from "./SignatureItemPanel";
import { galleryItem } from "@/lib/menu/menuGallery";

// A gallery wall whose text panels are menu items. The only thing /menu and the
// home page's preview need in common, and the only client boundary either of
// them needs: everything above it stays a server component.

export function SignatureGallery({ rows, rowHeight }: { rows: readonly GalleryRow[]; rowHeight?: string }) {
  return (
    <GalleryWall
      rows={rows}
      rowHeight={rowHeight}
      renderText={(id) => <SignatureItemPanel item={galleryItem(id)} />}
    />
  );
}
