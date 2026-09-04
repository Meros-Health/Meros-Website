"use client";

import type { ReactNode } from "react";

// The squared segmented control, once.
//
// This was three components: ui/SizeToggle, ui/BaseToggle and
// build/BuildSizeToggle. All three repeated the selected state, the unselected
// hairline, the negative-margin trick that stops hairlines doubling where two
// buttons meet, aria-pressed inside a role="group", and the 44px touch floor,
// which was written as minHeight: 44 in two of them and min-h-11 in the third.
// They differed only in how many columns they wanted and how their labels were
// built, which makes them variants rather than different components.
//
// This is presentational. The three callers stay, reduced to the thing they
// actually own: which options exist, what a label reads, and when the control
// should not render at all.

/** Half a pixel, pulled back. Matches borderWidth.hairline in tailwind.config. */
const HAIRLINE_PULL = "-0.5px";

// Container-query units, so a control inside a card follows that card's width.
// A parent without `container-type` falls back to the small viewport, which
// the clamp bounds keep sensible.
const CARD_FONT_SIZE = "clamp(0.5rem, 3.4cqw, 0.625rem)";
const CARD_PADDING = "clamp(0.35rem, 2.6cqw, 0.5rem) 0.25rem";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  /** Undefined means nothing is chosen yet, as in the add modal. */
  value: T | undefined;
  onChange: (value: T) => void;
  ariaLabel: string;
  /**
   * Buttons per row. Defaults to one row of everything. Pass 2 to wrap four
   * options into a card without shrinking the type to fit.
   */
  columns?: number;
  /**
   * `card` sizes the type in container-query units, for a control inside a
   * card or panel. `page` takes it from the type scale, for one that is not.
   */
  density?: "card" | "page";
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  columns,
  density = "card",
  className = "",
}: SegmentedControlProps<T>) {
  const perRow = columns ?? options.length;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`grid ${className}`.trim()}
      style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}
    >
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={[
              "font-body-caps tracking-headline border-hairline transition-colors duration-200",
              // Touch target floor (Apple HIG, WCAG 2.2 AAA)
              "min-h-11",
              density === "page" ? "text-label py-2" : "",
              selected
                ? "bg-grapefruit border-grapefruit text-cream"
                : "bg-transparent border-midnight/rule-strong text-midnight",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              ...(density === "card"
                ? { fontSize: CARD_FONT_SIZE, padding: CARD_PADDING }
                : null),
              // Hairlines would double up where neighbours meet.
              marginLeft: i % perRow === 0 ? 0 : HAIRLINE_PULL,
              marginTop: i < perRow ? 0 : HAIRLINE_PULL,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
