"use server";

import { CHECKOUT_ENABLED } from "@/lib/config";
import { getOrderDedupe, isIdempotencyKey } from "@/lib/checkout/idempotency";
import { logActionError, logOrder } from "@/lib/log";
import { calcBowlPrice, isSelectionComplete, PricingError, type BowlSelection } from "@/lib/menu/calcBowlPrice";
import { getBuildSize } from "@/lib/menu/buildConfig";
import { getSelectionHeadline, getSelectionKey, sanitizeSelection } from "@/lib/menu/selectionUtils";
import { getSignatureItem, getSignaturePrice, getSizeLabel } from "@/lib/menu/signatures";

export type CheckoutErrorCode =
  | "closed"
  | "form"
  | "cart"
  | "quantity"
  | "unavailable"
  | "price-changed"
  | "invalid"
  | "unknown";

export type CheckoutFormState = {
  status: "idle" | "success" | "error";
  message: string;
  orderRef?: string;
  /** Error only: the line the message is about, when it is about one line. */
  lineId?: string;
  code?: CheckoutErrorCode;
};

const MAX_LINES = 50;
const MAX_QUANTITY = 99;
const MAX_STEP_PICKS = 50;
const MAX_LINE_ID_LENGTH = 64;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 30;
const PRICE_TOLERANCE = 0.005;
const STEP_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const SUCCESS_MESSAGE = "Order received! We'll have it ready shortly.";

const LINE_MESSAGES: Record<LineErrorCode, string> = {
  quantity: "This quantity is not available. Reduce it to 99 or fewer.",
  unavailable: "This item is no longer available as selected. Remove it and add it again from the current menu.",
  "price-changed": "Prices have changed since you opened this page. Reload to see the current menu.",
  invalid: "Something went wrong with this item. Remove it and add it again.",
};

type LineErrorCode = Extract<CheckoutErrorCode, "quantity" | "unavailable" | "price-changed" | "invalid">;

type IncomingLine = {
  lineId?: unknown;
  kind?: unknown;
  productId?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  size?: { id?: unknown };
  selection?: unknown;
};

type PricedLine = {
  name: string;
  quantity: number;
  unitPrice: number;
};

type LineResult = { ok: true; line: PricedLine } | { ok: false; code: LineErrorCode };

function fail(code: LineErrorCode): LineResult {
  return { ok: false, code };
}

function error(code: CheckoutErrorCode, message: string, lineId?: string): CheckoutFormState {
  return { status: "error", code, message, lineId };
}

/** FormData values are strings or Files; anything but a string is treated as missing. */
function readField(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : null;
}

/** Echoed back to the client only when it is a short string; never reflected otherwise. */
function readLineId(line: IncomingLine): string | undefined {
  return typeof line.lineId === "string" && line.lineId.length <= MAX_LINE_ID_LENGTH ? line.lineId : undefined;
}

/**
 * Structural check only: a v2 selection is `{ sizeId, steps: { [stepId]: string[] } }`.
 * Whether the ids are offered is decided by sanitizeSelection against the menu.
 */
function readSelection(raw: unknown): BowlSelection | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const { sizeId, steps } = raw as { sizeId?: unknown; steps?: unknown };
  if (typeof sizeId !== "string") return null;
  if (typeof steps !== "object" || steps === null || Array.isArray(steps)) return null;

  const out: Record<string, string[]> = {};
  for (const [stepId, ids] of Object.entries(steps as Record<string, unknown>)) {
    // Step ids are kebab-case (scripts/validate-menu.mjs). Anything else,
    // "__proto__" included, is not a selection the menu can describe.
    if (!STEP_ID_PATTERN.test(stepId)) return null;
    if (!Array.isArray(ids) || ids.length > MAX_STEP_PICKS) return null;
    if (!ids.every((id) => typeof id === "string")) return null;
    out[stepId] = ids as string[];
  }
  return { sizeId, steps: out };
}

/**
 * Re-prices a cart line from the server-side menu. The client only supplies
 * ids, a quantity and the price it displayed; the displayed price is compared,
 * never used.
 */
function priceLine(raw: unknown): LineResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fail("invalid");
  const line = raw as IncomingLine;

  const quantity = line.quantity;
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return fail("quantity");
  }
  if (typeof line.unitPrice !== "number" || !Number.isFinite(line.unitPrice)) return fail("invalid");

  let priced: PricedLine;

  if (line.kind === "signature") {
    if (typeof line.productId !== "string") return fail("invalid");
    const sizeId = line.size?.id;
    if (typeof sizeId !== "string") return fail("invalid");
    const item = getSignatureItem(line.productId);
    if (!item) return fail("unavailable");
    // Unknown size for this item (e.g. "large" on a smoothie) is rejected, not priced.
    const unitPrice = getSignaturePrice(item.id, sizeId);
    if (unitPrice === undefined) return fail("unavailable");
    priced = { name: `${item.name} · ${getSizeLabel(item.category, sizeId)}`, quantity, unitPrice };
  } else if (line.kind === "custom") {
    const selection = readSelection(line.selection);
    if (!selection || !isSelectionComplete(selection)) return fail("invalid");

    // The client always sends a sanitized selection. A difference here means
    // the request was tampered with or the menu changed under the client;
    // either way the customer must see the bowl they would be charged for.
    const sanitized = sanitizeSelection(selection);
    if (!sanitized || getSelectionKey(sanitized) !== getSelectionKey(selection)) return fail("unavailable");

    let unitPrice: number;
    try {
      unitPrice = calcBowlPrice(sanitized);
    } catch (err) {
      if (err instanceof PricingError) return fail("unavailable");
      throw err;
    }

    const sizeLabel = getBuildSize(sanitized.sizeId)?.label ?? sanitized.sizeId;
    const name = ["Custom Bowl", getSelectionHeadline(sanitized), sizeLabel].filter(Boolean).join(" · ");
    priced = { name, quantity, unitPrice };
  } else {
    return fail("invalid");
  }

  if (Math.abs(priced.unitPrice - line.unitPrice) >= PRICE_TOLERANCE) return fail("price-changed");
  return { ok: true, line: priced };
}

function makeOrderRef(): string {
  return `MERŌS-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function submitCheckout(
  cartItemsJson: string,
  _prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  try {
    return await processCheckout(cartItemsJson, formData);
  } catch (err) {
    logActionError("checkout", err);
    return error("unknown", "Something went wrong. Please try again.");
  }
}

async function processCheckout(cartItemsJson: string, formData: FormData): Promise<CheckoutFormState> {
  if (!CHECKOUT_ENABLED) {
    return error("closed", "Ordering is not open yet.");
  }

  const name = readField(formData, "name");
  const email = readField(formData, "email");
  const phone = readField(formData, "phone");
  const idempotencyKey = readField(formData, "idempotencyKey");

  if (!name || !email || !phone) {
    return error("form", "All fields are required.");
  }

  if (name.length > MAX_NAME_LENGTH) {
    return error("form", `Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    return error("form", `Email must be ${MAX_EMAIL_LENGTH} characters or fewer.`);
  }
  if (phone.length > MAX_PHONE_LENGTH) {
    return error("form", `Phone must be ${MAX_PHONE_LENGTH} characters or fewer.`);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return error("form", "Please enter a valid email address.");
  }

  if (phone.replace(/\D/g, "").length < 10) {
    return error("form", "Please enter a valid phone number.");
  }

  if (!isIdempotencyKey(idempotencyKey)) {
    return error("invalid", "Something went wrong. Reload the page and try again.");
  }

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(cartItemsJson);
  } catch {
    return error("cart", "Something went wrong with your cart. Please try again.");
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return error("cart", "Your cart is empty.");
  }

  if (rawItems.length > MAX_LINES) {
    return error("cart", "Your cart has too many items. Please review it and try again.");
  }

  const items: PricedLine[] = [];
  for (const raw of rawItems) {
    const result = priceLine(raw);
    if (!result.ok) {
      const lineId = typeof raw === "object" && raw !== null ? readLineId(raw as IncomingLine) : undefined;
      return error(result.code, LINE_MESSAGES[result.code], lineId);
    }
    items.push(result.line);
  }

  const total = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const orderRef = makeOrderRef();

  // A repeated key (double submit, retry after a timeout) returns the order
  // that already exists rather than creating a second one.
  const claim = await getOrderDedupe().claim(idempotencyKey, orderRef);
  if (claim.status === "duplicate") {
    return { status: "success", message: SUCCESS_MESSAGE, orderRef: claim.orderRef };
  }

  // TODO(payment): integrate a payment processor here (e.g. Stripe PaymentIntent)
  // before marking the order placed. Prices above are recomputed server-side
  // from the menu, so they are safe to charge. Pass `idempotencyKey` through
  // so the processor and the POS dedupe on the same handle.
  //
  // TODO(stripe): when Stripe lands, also update the legal pages. Both
  // app/privacy/page.tsx and app/terms/page.tsx have TODO(stripe) comments
  // listing exactly what to change (list Stripe as a processor, describe
  // payment/refund flow, bump effective dates). Stripe's ToS also requires
  // a privacy policy to be live, which /privacy satisfies.
  logOrder(
    { orderRef, idempotencyKey, lineCount: items.length, total },
    { name, email, phone, items }
  );

  return { status: "success", message: SUCCESS_MESSAGE, orderRef };
}
