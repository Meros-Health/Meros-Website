"use client";

import Image from "next/image";
import { type ReactElement } from "react";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { usePathname } from "next/navigation";
import { INSTAGRAM_URL } from "@/lib/instagramFeed";
import { BUSINESS, SOCIAL_LINKS, hoursDisplay, mapsQuery, mapsUrl, appleMapsUrl } from "@/lib/business";
import { FOOTER_DESTINATIONS, HELP_LINKS } from "@/lib/nav";

// Address, hours and phone come from lib/business.ts, the same data the
// home page's Restaurant schema is built from.
const MAPS_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery())}&output=embed`;

// The footer's contact block opens the visitor's own mail client rather than
// posting to us. There is no email service behind the site, so a form here
// could only validate and discard; a mailto reaches a mailbox someone reads.
// The subject is prefilled so website mail is separable from everything else
// arriving at the same address.
const CONTACT_MAILTO = `mailto:${BUSINESS.email}?subject=${encodeURIComponent("Website inquiry")}`;
const CONTACT_TEL = `tel:${BUSINESS.phone.replace(/-/g, "")}`;

// The right column: four short lists rather than a paragraph and a button.
// Every destination the site has, grouped by what the visitor came to do.
const FOOTER_GROUPS = [
  {
    heading: "Contact",
    links: [
      { label: BUSINESS.email, href: CONTACT_MAILTO },
      { label: BUSINESS.phoneDisplay, href: CONTACT_TEL },
    ],
  },
  { heading: "Help", links: HELP_LINKS },
  { heading: "Go", links: FOOTER_DESTINATIONS },
  {
    heading: "Find Us",
    links: [
      { label: "Google Maps", href: mapsUrl() },
      { label: "Apple Maps", href: appleMapsUrl() },
    ],
  },
] as const;

const SOCIAL_ICONS: Record<string, (props: { size: number }) => ReactElement> = {
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
  TikTok: TikTokIcon,
};

// The ordering flow only: a footer full of exits does not belong under someone
// halfway through building a bowl. Prefix-matched so dynamic routes (e.g.
// /cart/edit/[lineId]) are covered too.
//
// /menu is deliberately not here. It was, back when the path was /order and the
// page was the first step of the flow. It is a page someone reads and leaves
// from now, so it gets the footer like every other page on the site.
const HIDDEN_ON = ["/build", "/checkout", "/cart"];

export function Footer() {
  const pathname = usePathname();

  if (HIDDEN_ON.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return null;
  }

  return (
    <footer id="footer" className="w-full bg-midnight text-cream" style={{ borderTop: "0.5px solid var(--veil-cream)" }}>

      {/* ── Brand mark ───────────────────────────────────────────────────── */}
      <div className="flex justify-center px-section-x py-10">
        <Image
          src="/logos/name-light.png"
          alt="MERŌS"
          width={160}
          height={48}
          className="opacity-80"
          priority={false}
        />
      </div>

      {/* ── Row 1: 3-column grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 px-section-x py-14 md:py-16">

        {/* ── LEFT + CENTER: Find Us / Follow Us ──────────────────────────── */}
        {/* One 2x2 grid rather than two independent columns: Find Us and
            Follow Us share a row, so the row sizes to the taller of the two
            and both top blocks occupy the same container space; the map and
            the storefront photo share the row under it, so their equal
            aspect-ratio squares land at the same height and bottom-align
            automatically. `order` reshuffles this back into one column per
            section on mobile, where the two rows do not apply. */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:col-span-2 gap-4 md:gap-x-8 md:gap-y-8">
          {/* Find Us */}
          <div className="order-1 flex flex-col gap-2">
            <span className="font-body-caps text-cream/40 text-meta tracking-micro-wide">Find Us</span>
            <address className="not-italic flex flex-col gap-0.5">
              <span className="font-body-mixed text-cream text-xs leading-relaxed">{BUSINESS.address.street}</span>
              <span className="font-body-mixed text-cream/55 text-xs leading-relaxed">
                {BUSINESS.address.neighbourhood}, {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}
              </span>
            </address>
            <span className="font-body-caps text-cream/55 text-meta tracking-label mt-2">
              {hoursDisplay()}
            </span>
          </div>

          {/* Follow Us. The label is on the link, not beside the icon: three
              marks this recognisable carry themselves, and a caption under
              each would crowd the row. mt-10 on mobile only, where it is the
              second block in one stacked column rather than beside Find Us,
              restores the section break the grid gap no longer gives it. */}
          <div className="order-3 md:order-2 flex flex-col items-center gap-4 mt-10 md:mt-0">
            <span className="font-body-caps text-cream/40 text-meta tracking-micro-wide">Follow Us</span>
            <div className="flex items-center justify-center gap-9">
              {SOCIAL_LINKS.map(({ label, href }) => {
                const Icon = SOCIAL_ICONS[label];
                return (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`MERŌS on ${label}`}
                    className="text-cream/55 hover:text-grapefruit transition-colors duration-200"
                  >
                    <Icon size={28} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Google Maps */}
          <div className="order-2 md:order-3 w-full overflow-hidden" style={{ aspectRatio: "1/1" }}>
            <iframe
              src={MAPS_EMBED_URL}
              width="100%"
              height="100%"
              style={{ border: 0, filter: "grayscale(1) invert(0.9) contrast(0.9)" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            title="MERŌS on Google Maps"
            />
          </div>

          {/* Storefront photo */}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit MERŌS on Instagram"
            className="order-4 relative block w-full overflow-hidden"
            style={{ aspectRatio: "1/1" }}
          >
            <Image
              src="/images-web/Footer/Storefront.jpg"
              alt="The MERŌS storefront in Yaletown"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
          </a>
        </div>

        {/* ── RIGHT: Link groups ──────────────────────────────────────── */}
        {/* Multi-column, not a grid: the groups flow into two columns and
            break where their own lengths put them, so a short group is not
            padded out to the height of the tall one beside it. */}
        <div className="columns-2 gap-x-8 md:pl-10 lg:pl-20">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading} className="flex flex-col gap-3 break-inside-avoid mb-7">
              <span className="font-body-caps text-cream/40 text-meta tracking-micro-wide">
                {group.heading}
              </span>
              <ul className="flex flex-col gap-1.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Copyright ─────────────────────────────────────────────────────── */}
      {/* The line the footer ends on. Privacy, Terms and the neighbourhood used
          to sit beside it; the first two are in the Help column now and the
          third is in the address above, so a bar carrying only a repeat of them
          was removed rather than kept for symmetry. No top padding here: the
          grid's own bottom padding sets the gap above, and `pb` matches it, so
          the line sits in even space top and bottom. */}
      <div className="flex justify-center px-section-x pb-14 md:pb-16">
        <span className="font-body-mixed text-cream/30 text-label">
          © {new Date().getFullYear()} MERŌS. All rights reserved.
        </span>
      </div>
    </footer>
  );
}

// ── Instagram wordmark icon ────────────────────────────────────────────────────

// All three are the official brand glyphs at a 24 viewBox, solid rather than
// outlined: at 28px an outlined mark next to two solid ones reads as a
// different weight, and the row stops looking like one set.
function InstagramIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.64.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85 0-3.2.01-3.58.07-4.85.15-3.23 1.66-4.77 4.92-4.92 1.27-.06 1.65-.07 4.85-.07ZM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12c0 3.26.01 3.67.07 4.95.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24c3.26 0 3.67-.01 4.95-.07 4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95 0-3.26-.01-3.67-.07-4.95-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z" />
    </svg>
  );
}

// One line of the right column. Site routes go through the page transition;
// mailto, tel and the two map providers are handed to the platform, and the
// external ones open in a new tab so the footer is not navigated away from.
function FooterLink({ label, href }: { label: string; href: string }) {
  const className =
    "font-body-mixed text-cream/70 text-xs leading-relaxed hover:text-grapefruit transition-colors duration-200";

  if (href.startsWith("/")) {
    return (
      <TransitionLink href={href} className={className}>
        {label}
      </TransitionLink>
    );
  }

  const isExternal = href.startsWith("http");
  return (
    <a
      href={href}
      className={className}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label}
    </a>
  );
}

function FacebookIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.86v-8.39H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.88v2.25h3.33l-.53 3.47h-2.8v8.39C19.61 23.02 24 18.06 24 12.07Z" />
    </svg>
  );
}

function TikTokIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z" />
    </svg>
  );
}
