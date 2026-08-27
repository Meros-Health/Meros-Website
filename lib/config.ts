/**
 * Launch gates.
 *
 * CHECKOUT_ENABLED gates the UI (the drawer's Checkout button, the /checkout
 * redirect) and submitCheckout itself, so the server never accepts an order
 * while the store believes ordering is off. Both sides read the same symbol,
 * inlined at build time from NEXT_PUBLIC_CHECKOUT_ENABLED. Set it to "true"
 * in the build environment (Workers Builds for production, .env.local for
 * dev) to open ordering. Unset means closed.
 */
export const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true";
