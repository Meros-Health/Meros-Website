import type { CartItem } from "@/store/cartStore";
import { getCartItemDisplayName } from "@/store/cartStore";
import { formatMacroSummary } from "@/lib/menu/nutrition";
import { migrateLegacySelection, type LegacyBowlSelectionSnapshot } from "@/lib/menu/selectionUtils";
import { CartLineActions } from "./CartLineActions";

export function formatCustomBowlIngredients(item: CartItem): string {
  if (!item.selection) return "";
  const selection = migrateLegacySelection(item.selection as LegacyBowlSelectionSnapshot);
  const parts: string[] = [selection.base.name];
  if (selection.fruitsBerries.length > 0) {
    parts.push(...selection.fruitsBerries.map((t) => t.name));
  }
  if (selection.nutsSeeds.length > 0) {
    parts.push(...selection.nutsSeeds.map((t) => t.name));
  }
  if (selection.finish) parts.push(selection.finish.name);
  if (selection.enhancers.length > 0) {
    parts.push(...selection.enhancers.map((s) => s.name));
  }
  return parts.join(", ");
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
