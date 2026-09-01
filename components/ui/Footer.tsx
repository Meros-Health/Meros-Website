"use client";

import Image from "next/image";
import { useState, useRef, type ReactElement } from "react";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { INSTAGRAM_POSTS, INSTAGRAM_URL, INSTAGRAM_HANDLE } from "@/lib/instagramFeed";
import { BUSINESS, SOCIAL_LINKS, hoursDisplay, mapsQuery, mapsUrl, appleMapsUrl } from "@/lib/business";
import { FOOTER_DESTINATIONS, HELP_LINKS } from "@/lib/nav";
import { useRevealReady } from "@/lib/useRevealReady";

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

// The footer's six tiles, named rather than sliced off the top of the feed, so
// which six show and in what order is one editable line instead of a
// consequence of the feed's authoring order. The homepage Instagram section
// still renders INSTAGRAM_POSTS as authored; only the footer picks.
//
// The Tropics shot is deliberately out: it reads as the retired Bloom, which
// is the same collision that retired the Bloom in the first place. Every id
// here resolves to a photo in public/images-web/Instagram/.
const FOOTER_POST_IDS = ["9", "2", "3", "4", "5", "7"] as const;

const FOOTER_INSTAGRAM_POSTS = FOOTER_POST_IDS.map((id) => {
  const post = INSTAGRAM_POSTS.find((p) => p.id === id);
  if (!post) throw new Error(`Footer feed: no Instagram post with id "${id}"`);
  return post;
});

// Prefix-matched so dynamic routes (e.g. /cart/edit/[lineId]) are covered too.
const HIDDEN_ON = ["/order", "/build", "/checkout", "/cart"];

export function Footer() {
  const pathname = usePathname();

  if (HIDDEN_ON.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return null;
  }

  return (
    <footer id="footer" className="w-full bg-midnight text-cream" style={{ borderTop: "0.5px solid rgba(255,247,240,0.10)" }}>

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

        {/* ── LEFT: Google Maps ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-body-caps text-cream/40 text-[9px] tracking-[0.30em]">Find Us</span>
            <address className="not-italic flex flex-col gap-0.5">
              <span className="font-body-mixed text-cream text-xs leading-relaxed">{BUSINESS.address.street}</span>
              <span className="font-body-mixed text-cream/55 text-xs leading-relaxed">
                {BUSINESS.address.neighbourhood}, {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}
              </span>
            </address>
            <span className="font-body-caps text-cream/55 text-[9px] tracking-[0.20em] mt-2">
              {hoursDisplay()}
            </span>
          </div>
          <div className="w-full overflow-hidden" style={{ aspectRatio: "1/1" }}>
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
        </div>

        {/* ── CENTER: Instagram feed ────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Profile header */}
          <div className="flex items-center gap-3">
            {/* Avatar: Instagram-style gradient ring */}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            aria-label="Visit MERŌS on Instagram"
              className="flex-shrink-0"
            >
              <div
                className="allow-round p-[3px] overflow-hidden"
                style={{ background: "linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)" }}
              >
                <div className="bg-midnight w-[44px] h-[44px] flex items-center justify-center overflow-hidden">
                  <div className="relative w-[78%] h-[78%]">
                    <Image
                      src="/logos/logo-terracotta.png"
                      alt="MERŌS"
                      fill
                      className="object-contain"
                      sizes="44px"
                    />
                  </div>
                </div>
              </div>
            </a>
            {/* Handle + verified badge */}
            <div className="flex items-center gap-1.5">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body-caps text-cream text-[13px] tracking-[0.20em] hover:text-cream/70 transition-colors duration-200"
              >
                {INSTAGRAM_HANDLE}
              </a>
              <svg width="14" height="14" viewBox="0 0 40 40" fill="none" aria-label="Verified" role="img">
                <circle cx="20" cy="20" r="20" fill="#0095f6" />
                <path d="M11 20.5l6.5 6.5 12-13" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* 6-post grid */}
          <div className="grid grid-cols-3" style={{ gap: "2px" }}>
            {FOOTER_INSTAGRAM_POSTS.map((post, i) => (
              <FooterInstagramTile key={post.id} post={post} index={i} />
            ))}
          </div>

          {/* One glyph per account, Instagram first. The label is on the
              link, not beside the icon: three marks this recognisable carry
              themselves, and a caption under each would crowd the row. */}
          <div className="flex flex-col items-center gap-4 pt-8">
            <span className="font-body-caps text-cream/40 text-[9px] tracking-[0.30em]">Follow Us</span>
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
        </div>

        {/* ── RIGHT: Link groups ──────────────────────────────────────── */}
        {/* Multi-column, not a grid: the groups flow into two columns and
            break where their own lengths put them, so a short group is not
            padded out to the height of the tall one beside it. */}
        <div className="columns-2 gap-x-8 md:pl-10 lg:pl-20">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading} className="flex flex-col gap-3 break-inside-avoid mb-7">
              <span className="font-body-caps text-cream/40 text-[9px] tracking-[0.30em]">
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

      {/* ── Icon mark ────────────────────────────────────────────────────── */}
      <div className="flex justify-center px-section-x py-8">
        <Image
          src="/logos/logo-light.png"
          alt="MERŌS"
          width={48}
          height={48}
          className="opacity-80"
          priority={false}
        />
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-section-x py-4"
        style={{ borderTop: "0.5px solid rgba(255,247,240,0.08)" }}
      >
      <span className="font-body-mixed text-cream/30 text-[10px]">
          © {new Date().getFullYear()} MERŌS. All rights reserved.
        </span>
        <div className="flex items-center gap-5">
          <TransitionLink
            href="/privacy"
            className="font-body-mixed text-cream/30 text-[10px] hover:text-cream/70 transition-colors duration-200"
          >
            Privacy Policy
          </TransitionLink>
          <TransitionLink
            href="/terms"
            className="font-body-mixed text-cream/30 text-[10px] hover:text-cream/70 transition-colors duration-200"
          >
            Terms of Service
          </TransitionLink>
          <span className="font-body-mixed text-cream/30 text-[10px]">
            Yaletown, Vancouver
          </span>
        </div>
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

// ── Footer Instagram tile ──────────────────────────────────────────────────────

interface FooterInstagramTileProps {
  post: (typeof INSTAGRAM_POSTS)[number];
  index: number;
}

function FooterInstagramTile({ post, index }: FooterInstagramTileProps) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLAnchorElement>(null);
  // Fades in only once its own image has decoded, so the grid never shows a
  // tile animating in around an empty frame.
  const show = useRevealReady(ref, "-40px");

  return (
    <motion.a
      ref={ref}
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{
        delay: Math.min((index % 3) * 0.05, 0.15),
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative block overflow-hidden"
      style={{ aspectRatio: "4/5" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Image
        src={post.imageUrl}
        alt={post.caption}
        fill
        sizes="(max-width: 768px) 33vw, 200px"
        className="object-cover"
        style={{
          transform: hovered ? "scale(1.04)" : "scale(1)",
          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
      <div
        className="hidden sm:flex absolute inset-0 items-center justify-center"
        style={{
          background: "rgba(0,0,0,0.45)",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>
    </motion.a>
  );
}
