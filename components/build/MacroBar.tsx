"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { macroPercent, type MacroKey } from "@/lib/menu/nutrition";

interface MacroBarProps {
  label: string;
  value: number;
  macroKey: MacroKey;
  unit?: string;
  fillClass?: string;
  reducedMotion?: boolean;
}

export function MacroBar({
  label,
  value,
  macroKey,
  unit = "g",
  fillClass = "bg-grapefruit",
  reducedMotion = false,
}: MacroBarProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  const targetPct = macroPercent(value, macroKey);
  const displayValue = macroKey === "calories" ? Math.round(value) : Math.round(value);

  useEffect(() => {
    if (!fillRef.current) return;

    if (reducedMotion) {
      fillRef.current.style.width = `${targetPct}%`;
      if (valueRef.current) valueRef.current.textContent = `${displayValue}${unit === "g" && macroKey !== "calories" ? unit : macroKey === "calories" ? "" : unit}`;
      prevValue.current = value;
      return;
    }

    gsap.to(fillRef.current, {
      width: `${targetPct}%`,
      duration: 0.4,
      ease: "power2.out",
    });

    if (valueRef.current) {
      const counter = { val: prevValue.current };
      gsap.to(counter, {
        val: value,
        duration: 0.4,
        ease: "power2.out",
        onUpdate: () => {
          if (valueRef.current) {
            const rounded = macroKey === "calories" ? Math.round(counter.val) : Math.round(counter.val);
            valueRef.current.textContent =
              macroKey === "calories" ? `${rounded}` : `${rounded}${unit}`;
          }
        },
      });
    }

    prevValue.current = value;
  }, [value, targetPct, reducedMotion, macroKey, unit, displayValue]);

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-body-caps text-[10px] tracking-widest text-juniper">{label}</span>
        <span ref={valueRef} className="font-body-mixed text-xs text-midnight tabular-nums">
          {macroKey === "calories" ? displayValue : `${displayValue}${unit}`}
        </span>
      </div>
      <div
        className="h-[3px] w-full"
        style={{ background: "rgba(41,45,42,0.12)" }}
        role="progressbar"
        aria-valuenow={displayValue}
        aria-valuemin={0}
        aria-valuemax={macroKey === "calories" ? 2000 : undefined}
        aria-label={`${label}: ${displayValue}`}
      >
        <div
          ref={fillRef}
          className={`h-full ${fillClass}`}
          style={{ width: `${targetPct}%` }}
        />
      </div>
    </div>
  );
}
