import type { CartItem } from "@/store/cartStore";
import { getCartItemDisplayName } from "@/store/cartStore";
import { getSelectedIngredients } from "@/lib/menu/calcBowlPrice";
import { formatMacroSummary } from "@/lib/menu/nutrition";
import { normalizeSelection } from "@/lib/menu/selectionUtils";
import { CartLineActions } from "./CartLineActions";

export function formatCustomBowlIngredients(item: CartItem): string {
  const selection = normalizeSelection(item.selection);
  if (!selection) return "";
  return getSelectedIngredients(selection)
    .map((ingredient) => ingredient.name)
    .join(", ");
}

interface CartLineItemProps {
  item: CartItem;
  showActions?: boolean;
}

export function CartLineItem({ item, showActions = true }: CartLineItemProps) {
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
            {getCartItemDisplayName(item)}
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
      {showActions && (
        <CartLineActions lineId={item.lineId} kind={item.kind} quantity={item.quantity} />
      )}
    </li>
  );
}
