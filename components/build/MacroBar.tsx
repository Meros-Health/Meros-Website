"use client";

import { MACRO_TARGETS, macroPercent, type MacroKey } from "@/lib/menu/nutrition";

interface MacroBarProps {
  label: string;
  value: number;
  macroKey: MacroKey;
  unit?: string;
  fillClass?: string;
}

const BAR_TRANSITION = "width 0.4s linear";

export function MacroBar({
  label,
  value,
  macroKey,
  unit = "g",
  fillClass = "bg-grapefruit",
}: MacroBarProps) {
  const targetPct = macroPercent(value, macroKey);
  const displayValue = Math.round(value);
  const target = MACRO_TARGETS[macroKey];
  const ariaUnit = macroKey === "calories" ? "calories" : "grams";

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-body-caps text-[9px] tracking-widest text-juniper">{label}</span>
        <span className="font-body-mixed text-[11px] text-midnight tabular-nums">
          {macroKey === "calories" ? displayValue : `${displayValue}${unit}`}
        </span>
      </div>
      <div
        className="h-[3px] w-full overflow-hidden"
        style={{ background: "rgba(41,45,42,0.12)" }}
        role="progressbar"
        aria-valuenow={displayValue}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuetext={`${displayValue} of ${target} ${ariaUnit} daily target`}
        aria-label={label}
      >
        <div
          className={`h-full ${fillClass}`}
          style={{
            width: `${targetPct}%`,
            transition: BAR_TRANSITION,
          }}
        />
      </div>
    </div>
  );
}
