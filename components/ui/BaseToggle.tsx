"use client";

import { formatBaseChoice, listBaseOptions } from "@/lib/menu/signatureBase";

// Squared segmented control for a signature item's yogurt, the companion of
// SizeToggle: two columns so four options stay legible inside a card. The
// options, their order and the vegan surcharge come from the Base build step
// in menu.json. `value` undefined means nothing chosen yet (a bowl before the
// customer picks). Used in the add/edit modal.
//
// Sizes are container-query units so the control follows the width of the
// card or panel it sits in; a parent without `container-type` falls back to
// the small viewport, which the clamp bounds keep sensible.

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
    <div className="grid grid-cols-2" role="group" aria-label={label} data-base-toggle>
      {options.map((option, i) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className="font-body-caps tracking-widest transition-colors duration-200"
            style={{
              fontSize: "clamp(0.5rem, 3.4cqw, 0.625rem)",
              padding: "clamp(0.35rem, 2.6cqw, 0.5rem) 0.25rem",
              border: selected ? "0.5px solid var(--color-grapefruit)" : "0.5px solid rgba(41,45,42,0.25)",
              // Hairline borders would double up where neighbours meet
              marginLeft: i % 2 === 0 ? 0 : "-0.5px",
              marginTop: i < 2 ? 0 : "-0.5px",
              background: selected ? "var(--color-grapefruit)" : "transparent",
              color: selected ? "var(--color-cream)" : "var(--color-midnight)",
            }}
          >
            {formatBaseChoice(option)}
          </button>
        );
      })}
    </div>
  );
}
