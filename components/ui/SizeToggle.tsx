"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getSizeTiers, type SignatureCategory } from "@/lib/menu/signatures";

// A signature item's size. Renders nothing for single-size categories
// (smoothies), so a layout only gains a row where there is a choice.
// `value` undefined means nothing chosen yet, as in the add modal.

export function SizeToggle({
  category,
  value,
  onChange,
}: {
  category: SignatureCategory;
  value: string | undefined;
  onChange: (sizeId: string) => void;
}) {
  const tiers = getSizeTiers(category);
  if (tiers.length < 2) return null;

  return (
    <SegmentedControl
      ariaLabel="Size"
      options={tiers.map((tier) => ({ value: tier.id, label: tier.label }))}
      value={value}
      onChange={onChange}
    />
  );
}
