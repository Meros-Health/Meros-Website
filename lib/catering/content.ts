// Catering page content, as data.
//
// Everything /catering renders comes from here so the copy can be corrected in
// one file instead of hunted through JSX. The four yogurts are named to match
// lib/menu/menu.json (the ids are asserted in tests/unit/catering.test.ts), so
// a base renamed on the menu cannot quietly drift out of the list.
//
// Scope: catering only. We serve volume for an occasion, to be eaten the day
// it is served. We do not supply yogurt for a business to hold as stock, which
// would put us in the manufacture-and-distribute lane a BC dairy licensee is
// licensed for and we are not. Nothing on this page may imply otherwise.
//
// Serving format is undecided and must stay unnamed. It could be tubs, paper
// bowls, glassware, or something else per order, and Kim does not know yet.
// The copy says "delivered, ready to serve" and stops. A test bans the format
// words, because guessing here writes a promise into a printed QR code.
//
// Claim discipline: this page is read by businesses deciding whether to buy.
// Nothing here promises a lead time, a price, a minimum, or a serving format,
// because none of those are set yet. Anything unresolved is stated as
// "confirmed in the quote" rather than invented.

export const CATERING_CONTACT = {
  /** Anchor ids. /cater redirects to the page (next.config.ts). */
  servesAnchor: "what-we-serve",
  yogurtsAnchor: "yogurts",
  inquiryAnchor: "inquire",
} as const;

export const CATERING_HERO = {
  eyebrow: "For business",
  title: "Catering",
  lead: "We cater offices, meetings and events across Vancouver. Yogurt in volume, built at the store and delivered ready to serve. Tell us the headcount and the date and we will quote it.",
} as const;

// ── What we serve ─────────────────────────────────────────────────────────────

export const CATERING_FORMATS = [
  {
    id: "bowls",
    name: "Individual bowls",
    body: "Bowls built and portioned at the store, labelled, and delivered ready to eat. The simplest option for a meeting or a shift change.",
  },
  {
    id: "bar",
    name: "Yogurt bar",
    body: "Yogurt and toppings set out in volume so people build their own. Suits a longer event where guests arrive over a couple of hours.",
  },
  {
    id: "smoothies",
    name: "Smoothies in bulk",
    body: "Smoothies made for the group and delivered cold. They are best within the hour, so we schedule them against your start time.",
  },
  {
    id: "staffed",
    name: "Staffed service",
    body: "One of our team runs the bar at your event, builds to order, and clears up afterwards. Booked ahead so we can cover the store.",
  },
] as const;

export const CATERING_AUDIENCE = [
  "Offices, meetings and team lunches",
  "Events, launches and receptions",
  "Studios, gyms and clinics",
  "Anything else with a headcount and a date",
] as const;

// ── The yogurts ───────────────────────────────────────────────────────────────

/** `id` matches the ingredient id in lib/menu/menu.json. */
export const CATERING_YOGURTS = [
  {
    id: "plain-greek-yogurt",
    name: "Plain Greek Yogurt",
    body: "Thick and unsweetened. Set out with the fruit, honey and granola alongside so the room sweetens it the way it wants.",
  },
  {
    id: "vanilla-greek-yogurt",
    name: "Vanilla Greek Yogurt",
    body: "Vanilla, lightly sweetened. Ready to eat as it is, or under fruit and granola.",
  },
  {
    id: "high-protein-yogurt",
    // "Non-fat", not "0% fat": the display face has no percent glyph, so "0%"
    // rendered as a gap in the heading. Same reason any future heading here
    // should avoid symbols.
    name: "Non-Fat High Protein",
    body: "Extra strained, no fat. For a gym, a clinic, or any room where the protein is the point.",
  },
  {
    id: "vegan-coconut-yogurt",
    name: "Vegan Coconut Yogurt",
    body: "Dairy free, coconut based. Put it out next to the others and the whole room is covered.",
  },
] as const;

export const CATERING_NOTES = [
  {
    id: "toppings",
    name: "Toppings alongside",
    body: "Granola, local raw honey, Canadian maple syrup, nuts, seeds and fruit. Anything on our topping list can come with the order.",
  },
  {
    id: "volume",
    name: "Served in volume",
    body: "Enough for a meeting, a floor, or a full event. Tell us the headcount and we work out the quantities with you.",
  },
  {
    id: "delivery",
    // Where the licensing boundary shows up in the copy: "made for the day it
    // is served". Stated as a fact about what arrives, not as a warning, and
    // deliberately silent on the serving format, which is not decided. The
    // scope is carried by the whole page being about occasions, headcounts and
    // dates, so this only has to be the last concrete detail.
    name: "Delivered ready to serve",
    body: "Everything arrives portioned for the headcount and made for the day it is served. How it is served is settled with you when we quote it.",
  },
] as const;

// ── How it works ──────────────────────────────────────────────────────────────

export const CATERING_STEPS = [
  {
    id: "tell",
    name: "Tell us what you need",
    body: "Headcount, date, and roughly how you want it served. The form below is enough to start.",
  },
  {
    id: "quote",
    name: "We quote it",
    body: "A written quote with pricing and delivery. Nothing is committed until you have seen the numbers.",
  },
  {
    id: "schedule",
    name: "Confirm and schedule",
    body: "One event, or a standing booking on a set day. Changes go through the same contact either way.",
  },
  {
    id: "invoice",
    name: "Delivered and invoiced",
    body: "We deliver across Vancouver. Every order comes with an itemised invoice and a receipt, ready for your books.",
  },
] as const;

/**
 * The account area is not built. This is what the page says instead of a dead
 * button, and it is also where the paperwork promise lives.
 *
 * Claim discipline is tighter here than anywhere else on the page. What a
 * business can deduct, reclaim or expense depends on its own tax position, and
 * saying otherwise is advice we are not qualified to give and cannot stand
 * behind. So the copy promises only the things we control: the invoice is
 * itemised, it is made out to the business rather than whoever ordered, and it
 * stays retrievable. What their accountant does with it is their call. A test
 * bans the advice vocabulary outright.
 */
export const CATERING_ACCOUNT_NOTE =
  "Catering accounts are on the way: sign in, reorder, pay on the site, and pull down the paperwork a finance team asks for. Invoices are itemised and made out to the business, and every past order stays retrievable for your records. Until then, orders go through the form below, by email, or by phone.";

// ── Structured data ───────────────────────────────────────────────────────────

/**
 * What this page offers, as a schema.org Service attached to the store's
 * Restaurant node (lib/business.ts). Claims only what the page claims: what is
 * served, and that it is served in Vancouver. No price, no rating.
 */
export function cateringServiceSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${siteUrl}/catering#service`,
        name: "Yogurt catering for offices and events",
        serviceType: "Catering",
        description:
          "Individual bowls, a build-your-own yogurt bar, smoothies in bulk, and staffed on-site service for offices, meetings and events in Vancouver. Delivered ready to serve on the day.",
        url: `${siteUrl}/catering`,
        provider: { "@id": `${siteUrl}/#restaurant` },
        areaServed: {
          "@type": "City",
          name: "Vancouver",
          addressRegion: "BC",
          addressCountry: "CA",
        },
      },
    ],
  };
}
