"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatBaseChoice, listBaseOptions } from "@/lib/menu/signatureBase";

// A signature item's yogurt, the companion of SizeToggle. Two columns so four
// options stay legible inside a card. The options, their order and the vegan
// surcharge come from the Base build step in menu.json. `value` undefined
// means nothing chosen yet (a bowl before the customer picks).

export function BaseToggle({
  value,
  onChange,
  label = "Yogurt",
}: {
  value: string | undefined;
  onChange: (baseId: string) => void;
  label?: string;
}) {
  const options = listBaseOptions();
  if (options.length === 0) return null;

  return (
    <SegmentedControl
      ariaLabel={label}
      columns={2}
      options={options.map((option) => ({
        value: option.id,
        label: formatBaseChoice(option),
      }))}
      value={value}
      onChange={onChange}
    />
  );
}
