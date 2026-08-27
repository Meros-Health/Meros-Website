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

/**
 * The canonical origin, used for metadataBase, the sitemap and robots.txt.
 *
 * Defaults to the live domain rather than whatever host is serving the
 * response, so absolute URLs stay canonical no matter which Worker route a
 * crawler happens to reach. Override with NEXT_PUBLIC_SITE_URL for a staging
 * origin. No trailing slash.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://merosyogurt.com").replace(/\/+$/, "");
