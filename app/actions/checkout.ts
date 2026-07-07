"use server";

import { getItemById } from "@/lib/menu/buildCatalog";
import { calcBowlPrice } from "@/lib/menu/calcBowlPrice";
import { getSignaturePrice } from "@/lib/menu/pricing";

export type CheckoutFormState = {
  status: "idle" | "success" | "error";
  message: string;
  orderRef?: string;
};

const MAX_LINES = 50;
const MAX_QUANTITY = 99;

type IncomingSelection = {
  base?: { id?: unknown };
  fruitsBerries?: Array<{ id?: unknown }>;
  nutsSeeds?: Array<{ id?: unknown }>;
  finish?: { id?: unknown } | null;
  enhancers?: Array<{ id?: unknown }>;
};

type IncomingLine = {
  kind?: unknown;
  productId?: unknown;
  quantity?: unknown;
  selection?: IncomingSelection;
};

type PricedLine = {
  name: string;
  quantity: number;
  unitPrice: number;
};

function resolveItems(refs: Array<{ id?: unknown }> | undefined) {
  const items = [];
  for (const ref of refs ?? []) {
    if (typeof ref?.id !== "string") return null;
    const item = getItemById(ref.id);
    if (!item) return null;
    items.push(item);
  }
  return items;
}

/**
 * Re-prices a cart line from the server-side catalog. The client only supplies
 * ids and quantities — prices are never trusted from the request.
 */
function priceLine(line: IncomingLine): PricedLine | null {
  const quantity = line.quantity;
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return null;
  }

  if (line.kind === "signature") {
    if (typeof line.productId !== "string") return null;
    const unitPrice = getSignaturePrice(line.productId);
    if (unitPrice <= 0) return null;
    return { name: line.productId, quantity, unitPrice };
  }

  if (line.kind === "custom") {
    const selection = line.selection;
    if (!selection || typeof selection.base?.id !== "string") return null;
    const base = getItemById(selection.base.id);
    if (!base || base.category !== "base") return null;

    const fruitsBerries = resolveItems(selection.fruitsBerries);
    const nutsSeeds = resolveItems(selection.nutsSeeds);
    const enhancers = resolveItems(selection.enhancers);
    if (!fruitsBerries || !nutsSeeds || !enhancers) return null;

    let finish = null;
    if (selection.finish) {
      if (typeof selection.finish.id !== "string") return null;
      finish = getItemById(selection.finish.id) ?? null;
      if (!finish) return null;
    }

    const unitPrice = calcBowlPrice({ base, fruitsBerries, nutsSeeds, finish, enhancers });
    return { name: `Custom Bowl · ${base.name}`, quantity, unitPrice };
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
  const orderRef = `MEROS-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  // TODO(payment): integrate a payment processor here (e.g. Stripe PaymentIntent)
  // before marking the order placed. Prices above are recomputed server-side
  // from the catalog, so they are safe to charge.
  //
  // TODO(stripe): when Stripe lands, also update the legal pages — both
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
