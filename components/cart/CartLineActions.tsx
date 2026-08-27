"use client";

import { useTransitionRouter } from "@/components/transition/TransitionProvider";
import { useCartStore } from "@/store/cartStore";
import { MAX_QUANTITY } from "@/lib/menu/limits";

interface CartLineActionsProps {
  lineId: string;
  kind: "signature" | "custom";
  quantity: number;
}

export function CartLineActions({ lineId, kind, quantity }: CartLineActionsProps) {
  const transitionRouter = useTransitionRouter();
  const incrementItem = useCartStore((s) => s.incrementItem);
  const decrementItem = useCartStore((s) => s.decrementItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const closeCart = useCartStore((s) => s.closeCart);

  const handleEdit = () => {
    closeCart();
    transitionRouter.push(`/cart/edit/${lineId}`);
  };

  const stepBtn =
    "font-body-caps text-[12px] leading-none px-3 py-2.5 transition-opacity hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed";
  const actionBtn =
    "flex-1 font-body-caps text-[10px] tracking-widest py-2.5 transition-opacity hover:opacity-80";

  return (
    <div className="flex items-stretch gap-2 mt-3">
      {/* Quantity stepper */}
      <div
        className="flex items-center"
        style={{ border: "0.5px solid rgba(41,45,42,0.28)" }}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={quantity <= 1}
          onClick={() => decrementItem(lineId)}
          className={stepBtn}
          style={{ color: "var(--color-midnight)" }}
        >
          −
        </button>
        <span
          aria-live="polite"
          className="font-body-caps text-[10px] text-midnight text-center"
          style={{ minWidth: "2ch" }}
        >
          {quantity}
        </span>
        <button
          type="button"
          aria-label={quantity >= MAX_QUANTITY ? "Maximum quantity reached" : "Increase quantity"}
          disabled={quantity >= MAX_QUANTITY}
          onClick={() => incrementItem(lineId)}
          className={stepBtn}
          style={{ color: "var(--color-midnight)" }}
        >
          +
        </button>
      </div>

      {kind === "custom" && (
        <button
          type="button"
          onClick={handleEdit}
          className={actionBtn}
          style={{
            background: "transparent",
            color: "var(--color-midnight)",
            border: "0.5px solid rgba(41,45,42,0.28)",
          }}
        >
          Edit
        </button>
      )}

      <button
        type="button"
        onClick={() => removeItem(lineId)}
        className={actionBtn}
        style={{
          background: "transparent",
          color: "var(--color-midnight)",
          border: "0.5px solid rgba(41,45,42,0.28)",
        }}
      >
        Remove
      </button>
    </div>
  );
}
