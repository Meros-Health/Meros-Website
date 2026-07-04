import type { CartItem } from "@/store/cartStore";
import { formatMacroSummary } from "@/lib/menu/nutrition";

export function formatCustomBowlIngredients(item: CartItem): string {
  if (!item.selection) return "";
  const parts: string[] = [item.selection.base.name];
  if (item.selection.toppings.length > 0) {
    parts.push(...item.selection.toppings.map((t) => t.name));
  }
  if (item.selection.drizzle) parts.push(item.selection.drizzle.name);
  if (item.selection.supplements.length > 0) {
    parts.push(...item.selection.supplements.map((s) => s.name));
  }
  return parts.join(", ");
}

export function CartLineItem({ item }: { item: CartItem }) {
  const isCustom = item.kind === "custom" && item.selection;

  return (
    <li
      style={{
        borderBottom: "0.5px solid rgba(41,45,42,0.12)",
        paddingBottom: "0.75rem",
      }}
    >
      <div className="flex justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="font-body-mixed text-sm text-midnight">
            {item.name}
            <span className="text-juniper ml-2">× {item.quantity}</span>
          </span>
          {isCustom && (
            <p className="font-body-mixed text-xs text-juniper mt-1 leading-relaxed">
              {formatCustomBowlIngredients(item)}
            </p>
          )}
          {isCustom && item.nutrition.calories > 0 && (
            <p className="font-body-caps text-[9px] tracking-widest text-grapefruit mt-1.5">
              {formatMacroSummary(item.nutrition)}
            </p>
          )}
        </div>
        <span className="font-body-caps text-[11px] text-midnight shrink-0">
          ${(item.unitPrice * item.quantity).toFixed(2)}
        </span>
      </div>
    </li>
  );
}
