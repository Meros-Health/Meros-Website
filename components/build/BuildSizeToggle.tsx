"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { BUILD_CONFIG } from "@/lib/menu/buildConfig";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";

// Bowl size on /build, with the price on the label. Renders nothing when the
// menu defines a single build size.
export function BuildSizeToggle() {
  const sizeId = useBowlBuilderStore((s) => s.selection.sizeId);
  const setSize = useBowlBuilderStore((s) => s.setSize);

  if (BUILD_CONFIG.sizes.length < 2) return null;

  return (
    <div className="flex items-center gap-4">
      <span className="font-body-caps text-meta tracking-micro text-juniper shrink-0">Size</span>
      <SegmentedControl
        ariaLabel="Bowl size"
        className="w-full max-w-xs"
        density="page"
        options={BUILD_CONFIG.sizes.map((size) => ({
          value: size.id,
          label: `${size.label} · $${size.price}`,
        }))}
        value={sizeId}
        onChange={setSize}
      />
    </div>
  );
}
