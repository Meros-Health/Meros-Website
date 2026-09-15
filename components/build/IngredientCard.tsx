"use client";

import type { Ingredient } from "@/lib/menu/ingredients";
import { BRAND, withAlpha } from "@/lib/design/colors";

interface IngredientCardProps {
  item: Ingredient;
  selected: boolean;
  priceLabel?: string | null;
  onSelect: () => void;
}

export function IngredientCard({ item, selected, priceLabel, onSelect }: IngredientCardProps) {
  const proteinHighlight = item.nutrition.protein >= 3;

  const textColor = selected ? "var(--color-cream)" : "var(--color-midnight)";
  const subtextColor = selected ? withAlpha(BRAND.cream, 0.85) : "var(--color-juniper)";
  const accentColor = selected ? "var(--color-cream)" : "var(--color-grapefruit)";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="relative flex flex-col text-left transition-all duration-200"
      style={{
        border: selected
          ? "1px solid var(--color-grapefruit)"
          : "1px solid var(--rule-midnight)",
        padding: "var(--ingredient-card-padding)",
        background: selected ? "var(--color-grapefruit)" : "transparent",
      }}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute top-2 right-2 font-body-caps text-badge"
          style={{ color: "var(--color-cream)" }}
        >
          ✓
        </span>
      )}

      <div className="flex items-start justify-between gap-2 mb-1">
        <span
          className="font-body-mixed leading-snug"
          style={{ color: textColor, fontSize: "var(--ingredient-name-size)" }}
        >
          {item.name}
        </span>
        {priceLabel && (
          <span
            className="font-body-caps shrink-0"
            style={{ color: subtextColor, fontSize: "var(--ingredient-meta-size)" }}
          >
            {priceLabel}
          </span>
        )}
      </div>

      {item.description && (
        <p
          className="font-body-mixed leading-relaxed mb-2"
          style={{ color: subtextColor, fontSize: "var(--ingredient-desc-size)" }}
        >
          {item.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <span
          className="font-body-caps tracking-headline"
          style={{ color: subtextColor, fontSize: "var(--ingredient-meta-size)" }}
        >
          {item.servingLabel}
        </span>
        {proteinHighlight && (
          <span
            className="font-body-caps tracking-headline px-1.5 py-0.5"
            style={{
              color: accentColor,
              fontSize: "var(--ingredient-badge-size)",
              // A matched pair, not one of the four semantic alphas: the
              // border has to read the same weight against a grapefruit fill
              // as against cream, and the two grounds need different alphas
              // to get there.
              border: selected
                ? `0.5px solid ${withAlpha(BRAND.cream, 0.5)}`
                : `0.5px solid ${withAlpha(BRAND.grapefruit, 0.4)}`,
            }}
          >
            +{Math.round(item.nutrition.protein)}g protein
          </span>
        )}
        {item.tags?.includes("vegan") && (
          <span
            className="font-body-caps tracking-headline"
            style={{ color: subtextColor, fontSize: "var(--ingredient-badge-size)" }}
          >
            Vegan
          </span>
        )}
      </div>
    </button>
  );
}
