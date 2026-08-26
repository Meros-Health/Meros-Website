"use client";

import type { Ingredient } from "@/lib/menu/ingredients";

interface IngredientCardProps {
  item: Ingredient;
  selected: boolean;
  priceLabel?: string | null;
  onSelect: () => void;
}

export function IngredientCard({ item, selected, priceLabel, onSelect }: IngredientCardProps) {
  const proteinHighlight = item.nutrition.protein >= 3;

  const textColor = selected ? "var(--color-cream)" : "var(--color-midnight)";
  const subtextColor = selected ? "rgba(255,247,240,0.85)" : "var(--color-juniper)";
  const accentColor = selected ? "var(--color-cream)" : "var(--color-grapefruit)";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="relative flex flex-col text-left transition-all duration-200"
      style={{
        border: selected
          ? "0.5px solid var(--color-grapefruit)"
          : "0.5px solid rgba(41,45,42,0.15)",
        padding: "clamp(0.75rem, 2vw, 1rem)",
        background: selected ? "var(--color-grapefruit)" : "transparent",
      }}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute top-2 right-2 font-body-caps text-[8px]"
          style={{ color: "var(--color-cream)" }}
        >
          ✓
        </span>
      )}

      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-body-mixed text-sm leading-snug" style={{ color: textColor }}>
          {item.name}
        </span>
        {priceLabel && (
          <span className="font-body-caps text-[9px] shrink-0" style={{ color: subtextColor }}>
            {priceLabel}
          </span>
        )}
      </div>

      {item.description && (
        <p
          className="font-body-mixed text-[11px] leading-relaxed mb-2"
          style={{ color: subtextColor }}
        >
          {item.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <span className="font-body-caps text-[9px] tracking-widest" style={{ color: subtextColor }}>
          {item.servingLabel}
        </span>
        {proteinHighlight && (
          <span
            className="font-body-caps text-[8px] tracking-widest px-1.5 py-0.5"
            style={{
              color: accentColor,
              border: selected
                ? "0.5px solid rgba(255,247,240,0.5)"
                : "0.5px solid rgba(215,142,119,0.4)",
            }}
          >
            +{Math.round(item.nutrition.protein)}g protein
          </span>
        )}
        {item.tags?.includes("vegan") && (
          <span className="font-body-caps text-[8px] tracking-widest" style={{ color: subtextColor }}>
            Vegan
          </span>
        )}
      </div>
    </button>
  );
}
