"use server";

import { calcBowlPrice, isSelectionComplete, PricingError, type BowlSelection } from "@/lib/menu/calcBowlPrice";
import { getBuildSize } from "@/lib/menu/buildConfig";
import { getSelectionHeadline } from "@/lib/menu/selectionUtils";
import { getSignatureItem, getSignaturePrice, getSizeLabel } from "@/lib/menu/signatures";

export type CheckoutFormState = {
  status: "idle" | "success" | "error";
  message: string;
  orderRef?: string;
};

const MAX_LINES = 50;
const MAX_QUANTITY = 99;
const MAX_STEP_PICKS = 50;

type IncomingLine = {
  kind?: unknown;
  productId?: unknown;
  quantity?: unknown;
  size?: { id?: unknown };
  selection?: unknown;
};

type PricedLine = {
  name: string;
  quantity: number;
  unitPrice: number;
};

/**
 * Structural check only: a v2 selection is `{ sizeId, steps: { [stepId]: string[] } }`.
 * Whether the ids are offered is decided by calcBowlPrice against the menu.
 */
function readSelection(raw: unknown): BowlSelection | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const { sizeId, steps } = raw as { sizeId?: unknown; steps?: unknown };
  if (typeof sizeId !== "string") return null;
  if (typeof steps !== "object" || steps === null || Array.isArray(steps)) return null;

  const out: Record<string, string[]> = {};
  for (const [stepId, ids] of Object.entries(steps as Record<string, unknown>)) {
    if (!Array.isArray(ids) || ids.length > MAX_STEP_PICKS) return null;
    if (!ids.every((id) => typeof id === "string")) return null;
    out[stepId] = ids as string[];
  }
  return { sizeId, steps: out };
}

/**
 * Re-prices a cart line from the server-side menu. The client only supplies
 * ids and quantities; prices are never trusted from the request.
 */
function priceLine(line: IncomingLine): PricedLine | null {
  const quantity = line.quantity;
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return null;
  }

  if (line.kind === "signature") {
    if (typeof line.productId !== "string") return null;
    const sizeId = line.size?.id;
    if (typeof sizeId !== "string") return null;
    const item = getSignatureItem(line.productId);
    if (!item) return null;
    // Unknown size for this item (e.g. "large" on a smoothie) is rejected, not priced.
    const unitPrice = getSignaturePrice(item.id, sizeId);
    if (unitPrice === undefined) return null;
    return { name: `${item.name} · ${getSizeLabel(item.category, sizeId)}`, quantity, unitPrice };
  }

  if (line.kind === "custom") {
    const selection = readSelection(line.selection);
    if (!selection || !isSelectionComplete(selection)) return null;

    // calcBowlPrice rejects an unknown size, an unknown step, an ingredient
    // not offered in that step, and over-selection on "one" / hard-cap steps.
    let unitPrice: number;
    try {
      unitPrice = calcBowlPrice(selection);
    } catch (err) {
      if (err instanceof PricingError) return null;
      throw err;
    }

    const sizeLabel = getBuildSize(selection.sizeId)?.label ?? selection.sizeId;
    const name = ["Custom Bowl", getSelectionHeadline(selection), sizeLabel].filter(Boolean).join(" · ");
    return { name, quantity, unitPrice };
  }

  return null;
}

export async function submitCheckout(
  cartItemsJson: string,
  _prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();

  if (!name || !email || !phone) {
    return { status: "error", message: "All fields are required." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  if (phone.replace(/\D/g, "").length < 10) {
    return { status: "error", message: "Please enter a valid phone number." };
  }

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(cartItemsJson);
  } catch {
    return { status: "error", message: "Something went wrong with your cart. Please try again." };
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { status: "error", message: "Your cart is empty." };
  }

  if (rawItems.length > MAX_LINES) {
    return { status: "error", message: "Your cart has too many items. Please review it and try again." };
  }

  const items: PricedLine[] = [];
  for (const raw of rawItems as IncomingLine[]) {
    const priced = priceLine(raw);
    if (!priced) {
      return { status: "error", message: "Something went wrong with your cart. Please try again." };
    }
    items.push(priced);
  }

  const total = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const orderRef = `MERŌS-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  // TODO(payment): integrate a payment processor here (e.g. Stripe PaymentIntent)
  // before marking the order placed. Prices above are recomputed server-side
  // from the menu, so they are safe to charge.
  //
  // TODO(stripe): when Stripe lands, also update the legal pages. Both
  // app/privacy/page.tsx and app/terms/page.tsx have TODO(stripe) comments
  // listing exactly what to change (list Stripe as a processor, describe
  // payment/refund flow, bump effective dates). Stripe's ToS also requires
  // a privacy policy to be live, which /privacy satisfies.
  //
  // Note: this log includes customer personal info (name/email/phone). Fine
  // for local dev, but before production either remove it or make sure log
  // retention is treated as personal-data storage under the privacy policy.
  console.log("[checkout]", { orderRef, name, email, phone, items, total });

  return {
    status: "success",
    message: "Order received! We'll have it ready shortly.",
    orderRef,
  };
}
