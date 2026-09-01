// Every place on this site a visitor can be sent, in one file.
//
// The nav bar carries only the menu toggle, the wordmark and the cart, so
// NAV_LINKS is the only way into a route from the header: a route that is not
// here is unreachable from the nav. FOOTER_DESTINATIONS is the footer's "Go"
// column, and HELP_LINKS is its "Help" column. tests/unit/nav.test.ts is what
// stops the two indexes drifting apart when a page is added to one only.

export type SiteLink = { label: string; href: string };

export const NAV_LINKS: SiteLink[] = [
  { label: "Home", href: "/" },
  { label: "Build", href: "/build" },
  { label: "Order", href: "/order" },
  { label: "Catering", href: "/catering" },
];

/** The footer's "Go" column. Mirrors the nav, Home included. */
export const FOOTER_DESTINATIONS: SiteLink[] = [
  { label: "Home", href: "/" },
  { label: "Build", href: "/build" },
  { label: "Order", href: "/order" },
  { label: "Catering", href: "/catering" },
];

// Cookies and payment have no pages of their own; they are sections of the two
// legal pages that already cover them. The ids are set explicitly on those
// LegalSections, so renaming a heading cannot silently break these links.
export const HELP_LINKS: SiteLink[] = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookies", href: "/privacy#cookies" },
  { label: "Payment Options", href: "/terms#payment" },
  { label: "Refunds", href: "/terms#refunds" },
];
