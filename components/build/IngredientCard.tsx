"use client";

import type { BuildItem } from "@/lib/menu/buildCatalog";

interface IngredientCardProps {
  item: BuildItem;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function IngredientCard({ item, selected, disabled = false, onSelect }: IngredientCardProps) {
  const proteinHighlight = item.nutrition.protein >= 3;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className="flex flex-col text-left transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        border: selected
          ? "0.5px solid var(--color-grapefruit)"
          : "0.5px solid rgba(41,45,42,0.15)",
        padding: "clamp(0.75rem, 2vw, 1rem)",
        background: selected ? "rgba(215,142,119,0.06)" : "transparent",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-body-mixed text-sm text-midnight leading-snug">{item.name}</span>
        <span className="font-body-caps text-[9px] text-juniper shrink-0">
          +${item.price.toFixed(2)}
        </span>
      </div>

      {item.description && (
        <p className="font-body-mixed text-[11px] text-juniper leading-relaxed mb-2">
          {item.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <span className="font-body-caps text-[9px] tracking-widest text-juniper/80">
          {item.servingLabel}
        </span>
        {proteinHighlight && (
          <span
            className="font-body-caps text-[8px] tracking-widest text-grapefruit px-1.5 py-0.5"
            style={{ border: "0.5px solid rgba(215,142,119,0.4)" }}
          >
            +{Math.round(item.nutrition.protein)}g protein
          </span>
        )}
        {item.tags?.includes("vegan") && (
          <span className="font-body-caps text-[8px] tracking-widest text-juniper">Vegan</span>
        )}
      </div>
    </button>
  );
}
