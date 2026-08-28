// The store as data. The footer renders from this and the Restaurant JSON-LD
// on the home page is built from it, so the address, phone and hours that
// Google surfaces can never drift from the ones a visitor reads.

import { INSTAGRAM_URL } from "@/lib/instagramFeed";

export const BUSINESS = {
  name: "MERŌS House of Yogurt",
  description: "Greek yogurt bowls and smoothies, strained and built in-house. Yaletown, Vancouver.",
  phone: "+1-778-345-3023",
  phoneDisplay: "(778) 345-3023",
  email: "info@merosyogurt.com",
  address: {
    street: "1207 Hamilton Street",
    neighbourhood: "Yaletown",
    city: "Vancouver",
    region: "BC",
    postalCode: "V6B 2R5",
    country: "CA",
  },
  // 1207 Hamilton Street per OpenStreetMap, 2026-08-28.
  geo: { latitude: 49.274713, longitude: -123.12277 },
  // Every day of the week, 24-hour local time. Confirmed by Thomas 2026-08-28.
  hours: { opens: "08:00", closes: "22:00" },
  priceRange: "$$",
  servesCuisine: ["Greek yogurt bowls", "Smoothies"],
  sameAs: [INSTAGRAM_URL],
} as const;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// "08:00" to "8 AM"; "22:00" to "10 PM".
function displayTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

/** The footer's hours line. An en dash is correct typography for a range. */
export function hoursDisplay(): string {
  return `Open ${displayTime(BUSINESS.hours.opens)} – ${displayTime(BUSINESS.hours.closes)} Daily`;
}

// Query the live Google Maps listing instead of storing a brittle, generic
// neighbourhood embed. Plain "Meros": the listing name has no macron.
export function mapsQuery(): string {
  const { street, city, region } = BUSINESS.address;
  return `Meros, ${street}, ${city}, ${region}`;
}

export function mapsUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery())}`;
}

/** schema.org Restaurant for the home page. */
export function restaurantSchema(siteUrl: string, logoPath: string, imagePath: string) {
  const { street, city, region, postalCode, country } = BUSINESS.address;
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${siteUrl}/#restaurant`,
    name: BUSINESS.name,
    description: BUSINESS.description,
    url: siteUrl,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    image: `${siteUrl}${imagePath}`,
    logo: `${siteUrl}${logoPath}`,
    priceRange: BUSINESS.priceRange,
    servesCuisine: [...BUSINESS.servesCuisine],
    address: {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: city,
      addressRegion: region,
      postalCode,
      addressCountry: country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAYS,
        opens: BUSINESS.hours.opens,
        closes: BUSINESS.hours.closes,
      },
    ],
    hasMap: mapsUrl(),
    sameAs: [...BUSINESS.sameAs],
  };
}

/** schema.org BreadcrumbList for an interior route: Home, then the page. */
export function breadcrumbSchema(siteUrl: string, name: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name, item: `${siteUrl}${path}` },
    ],
  };
}
