"use client";

import { getSizeTiers, type SignatureCategory } from "@/lib/menu/signatures";

// Squared segmented control for a signature item's size. Renders nothing for
// single-size categories (smoothies), so a layout only gains a row where there
// is a choice. Used on the order cards and in the cart's edit modal.
//
// Sizes are container-query units so the control follows the width of the
// card or panel it sits in; a parent without `container-type` falls back to
// the small viewport, which the clamp bounds keep sensible.

export function SizeToggle({
  category,
  value,
  onChange,
}: {
  category: SignatureCategory;
  value: string;
  onChange: (sizeId: string) => void;
}) {
  const tiers = getSizeTiers(category);
  if (tiers.length < 2) return null;

  return (
    <div className="flex" role="group" aria-label="Size">
      {tiers.map((tier, i) => {
        const selected = tier.id === value;
        return (
          <button
            key={tier.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(tier.id)}
            className="flex-1 font-body-caps tracking-widest transition-colors duration-200"
            style={{
              fontSize: "clamp(0.5rem, 3.4cqw, 0.625rem)",
              padding: "clamp(0.35rem, 2.6cqw, 0.5rem) 0",
              border: selected
                ? "0.5px solid var(--color-grapefruit)"
                : "0.5px solid rgba(41,45,42,0.25)",
              // Hairline borders would double up where the two buttons meet
              marginLeft: i === 0 ? 0 : "-0.5px",
              background: selected ? "var(--color-grapefruit)" : "transparent",
              color: selected ? "var(--color-cream)" : "var(--color-midnight)",
            }}
          >
            {tier.label}
          </button>
        );
      })}
    </div>
  );
}
