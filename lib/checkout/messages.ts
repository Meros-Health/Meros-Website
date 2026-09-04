/**
 * Customer-facing copy for a line the server refused. Shared by the action
 * (which returns it) and the checkout page (which shows the same line before
 * a submit when it can already tell, e.g. a bowl with no yogurt chosen).
 * Lives outside app/actions because a "use server" module cannot export a
 * constant to the client.
 */
export type LineErrorCode = "quantity" | "unavailable" | "price-changed" | "base" | "invalid";

export const LINE_MESSAGES: Record<LineErrorCode, string> = {
  quantity: "This quantity is not available. Reduce it to 99 or fewer.",
  unavailable: "This item is no longer available as selected. Remove it and add it again from the current menu.",
  "price-changed": "Prices have changed since you opened this page. Reload to see the current menu.",
  base: "Choose a yogurt for this item before ordering.",
  invalid: "Something went wrong with this item. Remove it and add it again.",
};

/** Under the Checkout button and the Place Order button while a line has no yogurt. */
export const MISSING_BASE_HINT = "Choose a yogurt for the marked item to check out.";

/**
 * Shown in the cart drawer and at checkout, from one constant so the two
 * cannot drift. Meros does not deliver its own orders: delivery is Uber Eats
 * and DoorDash, in their apps. Someone who reaches the payment screen still
 * expecting delivery is a refund and a bad review.
 */
export const PICKUP_ONLY_NOTE = "Pickup only. Orders placed here are collected at the store in Yaletown.";
