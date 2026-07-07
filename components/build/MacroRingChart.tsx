"use client";

import { useMemo } from "react";
import {
  computeNutritionRingSlices,
  formatNutritionSegmentValue,
  NUTRITION_SEGMENT_GROUPS,
  NUTRITION_SEGMENTS,
  type NutritionFacts,
  type NutritionRingSlice,
  type NutritionSegmentGroup,
} from "@/lib/menu/nutrition";

interface MacroRingChartProps {
  nutrition: NutritionFacts;
}

const SIZE = 148;
const STROKE = 13;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_DEGREES = 2;
const RING_TRANSITION =
  "stroke-dasharray 0.4s linear, transform 0.4s linear";

function RingSegment({ slice }: { slice: NutritionRingSlice }) {
  const arcDegrees = Math.max(0, slice.share * 360 - GAP_DEGREES);
  const arcLength = (arcDegrees / 360) * CIRCUMFERENCE;
  const rotation = slice.offset * 360 - 90 + GAP_DEGREES / 2;

  return (
    <circle
      cx={CENTER}
      cy={CENTER}
      r={RADIUS}
      fill="none"
      stroke={slice.color}
      strokeWidth={STROKE}
      strokeLinecap="butt"
      strokeDasharray={`${arcLength} ${CIRCUMFERENCE}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: `${CENTER}px ${CENTER}px`,
        transition: RING_TRANSITION,
      }}
    />
  );
}

function groupSlices(slices: NutritionRingSlice[]): Map<NutritionSegmentGroup, NutritionRingSlice[]> {
  const grouped = new Map<NutritionSegmentGroup, NutritionRingSlice[]>();
  for (const slice of slices) {
    const list = grouped.get(slice.group) ?? [];
    list.push(slice);
    grouped.set(slice.group, list);
  }
  return grouped;
}

export function MacroRingChart({ nutrition }: MacroRingChartProps) {
  const slices = useMemo(() => computeNutritionRingSlices(nutrition), [nutrition]);
  const grouped = useMemo(() => groupSlices(slices), [slices]);
  const calories = Math.round(nutrition.calories);
  const hasData = slices.length > 0;

  const groupOrder: NutritionSegmentGroup[] = ["macro", "fiber", "mineral"];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative mx-auto shrink-0 sm:mx-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={
            hasData
              ? `Nutrition allocation for ${calories} calories`
              : "Nutrition allocation chart, no ingredients selected"
          }
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="rgba(41,45,42,0.1)"
            strokeWidth={STROKE}
          />
          {slices.map((slice) => (
            <RingSegment key={slice.id} slice={slice} />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-headline text-[1.65rem] leading-none text-midnight tabular-nums">
            {calories}
          </span>
          <span className="mt-0.5 font-body-caps text-[8px] tracking-[0.2em] text-juniper">cal</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {hasData ? (
          <div className="flex flex-col gap-3">
            {groupOrder.map((group) => {
              const items = grouped.get(group);
              if (!items?.length) return null;

              return (
                <div key={group}>
                  <p className="mb-1.5 font-body-caps text-[8px] tracking-[0.18em] text-juniper/80">
                    {NUTRITION_SEGMENT_GROUPS[group]}
                  </p>
                  <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                    {items.map((slice) => (
                      <li key={slice.id} className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0"
                          style={{ background: slice.color }}
                          aria-hidden
                        />
                        <span className="min-w-0 truncate font-body-caps text-[9px] tracking-widest text-midnight">
                          {slice.label}
                        </span>
                        <span className="ml-auto shrink-0 font-body-mixed text-[10px] tabular-nums text-juniper">
                          {formatNutritionSegmentValue(slice.value, slice.unit)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="font-body-mixed text-[11px] text-juniper">
              Add ingredients to see how your bowl allocates protein, carbs, fat, fiber, and minerals.
            </p>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {NUTRITION_SEGMENTS.map((segment) => (
                <li key={segment.id} className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 opacity-40"
                    style={{ background: segment.color }}
                    aria-hidden
                  />
                  <span className="font-body-caps text-[8px] tracking-widest text-juniper/70">
                    {segment.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
