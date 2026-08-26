"use client";

import { BUILD_CONFIG } from "@/lib/menu/buildConfig";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";

// Squared segmented control, same treatment as the signature size toggle on
// /order. Renders nothing when the menu defines a single build size.
export function BuildSizeToggle() {
  const sizeId = useBowlBuilderStore((s) => s.selection.sizeId);
  const setSize = useBowlBuilderStore((s) => s.setSize);

  if (BUILD_CONFIG.sizes.length < 2) return null;

  return (
    <div className="flex items-center gap-4">
      <span className="font-body-caps text-[9px] tracking-[0.25em] text-juniper shrink-0">Size</span>
      <div className="flex w-full max-w-xs" role="group" aria-label="Bowl size">
        {BUILD_CONFIG.sizes.map((size, i) => {
          const selected = size.id === sizeId;
          return (
            <button
              key={size.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setSize(size.id)}
              className="flex-1 font-body-caps text-[10px] tracking-widest py-2 transition-colors duration-200"
              style={{
                border: selected
                  ? "0.5px solid var(--color-grapefruit)"
                  : "0.5px solid rgba(41,45,42,0.25)",
                // Hairline borders would double up where the buttons meet
                marginLeft: i === 0 ? 0 : "-0.5px",
                background: selected ? "var(--color-grapefruit)" : "transparent",
                color: selected ? "var(--color-cream)" : "var(--color-midnight)",
              }}
            >
              {size.label} · ${size.price}
            </button>
          );
        })}
      </div>
    </div>
  );
}
