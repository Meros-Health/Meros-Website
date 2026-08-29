import type { CartItem } from "@/store/cartStore";
import { getCartItemDisplayName } from "@/store/cartStore";
import { getSelectedIngredients } from "@/lib/menu/calcBowlPrice";
import { ingredientName } from "@/lib/menu/ingredients";
import { formatMacroSummary } from "@/lib/menu/nutrition";
import { normalizeSelection } from "@/lib/menu/selectionUtils";
import { formatSignatureMods, hasMods } from "@/lib/menu/signatureMods";
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
  /** Checkout rejected this line; shown under it so the customer knows which one to fix. */
  error?: string;
}

export function CartLineItem({ item, showActions = true, error }: CartLineItemProps) {
  const isCustom = item.kind === "custom" && item.selection;
  const modsText = item.kind === "signature" && hasMods(item.mods) ? formatSignatureMods(item.mods) : "";
  // The yogurt under a signature. A bowl persisted before the yogurt became a
  // choice, or whose yogurt left the menu, has none: say so, since checkout
  // will not take it until one is chosen (Edit opens the picker).
  const baseText = item.kind === "signature" ? (item.base ? ingredientName(item.base) : "Choose your yogurt") : "";
  const baseMissing = item.kind === "signature" && !item.base;

  return (
    <li
      data-line-id={item.lineId}
      data-line-error={error ? "true" : undefined}
      style={{
        borderBottom: "0.5px solid rgba(41,45,42,0.12)",
        paddingBottom: "0.75rem",
        ...(error
          ? { borderLeft: "2px solid var(--color-grapefruit)", paddingLeft: "0.75rem" }
          : undefined),
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
          {baseText && (
            <p
              data-line-base
              data-line-base-missing={baseMissing ? "true" : undefined}
              className={`font-body-mixed text-xs mt-1 leading-relaxed ${baseMissing ? "text-grapefruit" : "text-juniper"}`}
            >
              {baseText}
            </p>
          )}
          {modsText && (
            <p data-line-mods className="font-body-mixed text-xs text-juniper mt-1 leading-relaxed">
              {modsText}
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
      {error && (
        <p role="alert" className="font-body-mixed text-grapefruit text-[11px] mt-1.5 leading-relaxed">
          {error}
        </p>
      )}
      {showActions && (
        <CartLineActions
          lineId={item.lineId}
          kind={item.kind}
          name={getCartItemDisplayName(item)}
          quantity={item.quantity}
        />
      )}
    </li>
  );
}
