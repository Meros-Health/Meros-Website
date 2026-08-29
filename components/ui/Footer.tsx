"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { submitContactForm, type ContactFormState } from "@/app/actions/contact";
import { INSTAGRAM_POSTS, INSTAGRAM_URL, INSTAGRAM_HANDLE } from "@/lib/instagramFeed";
import { BUSINESS, hoursDisplay, mapsQuery, mapsUrl } from "@/lib/business";
import { useRevealReady } from "@/lib/useRevealReady";

// Address, hours and phone come from lib/business.ts, the same data the
// home page's Restaurant schema is built from.
const MAPS_URL = mapsUrl();
const MAPS_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery())}&output=embed`;

// Prefix-matched so dynamic routes (e.g. /cart/edit/[lineId]) are covered too.
const HIDDEN_ON = ["/order", "/build", "/checkout", "/cart"];

export function Footer() {
  const pathname = usePathname();
  const [state, setState] = useState<ContactFormState>({ status: "idle", message: "" });
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const submittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The disabled attribute only applies after the next render; the ref
    // stops a second submit dispatched in the same tick.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await submitContactForm(state, formData);
      setState(result);
      if (result.status === "success") formRef.current?.reset();
    } catch {
      setState({ status: "error", message: "Something went wrong. Please try again." });
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  if (HIDDEN_ON.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return null;
  }

  return (
    <footer id="footer" className="w-full bg-midnight text-cream" style={{ borderTop: "0.5px solid rgba(255,247,240,0.10)" }}>

      {/* ── Brand mark ───────────────────────────────────────────────────── */}
      <div
        className="flex justify-center px-section-x py-10"
        style={{ borderBottom: "0.5px solid rgba(255,247,240,0.08)" }}
      >
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
          <div className="flex items-start justify-between gap-4">
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
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-0.5 flex shrink-0 items-center gap-1.5 font-body-caps text-[8px] tracking-[0.18em] text-cream/55 transition-colors duration-200 hover:text-grapefruit"
              aria-label="Open MERŌS in Google Maps"
            >
              <MapPinIcon />
              <span>Open map</span>
            </a>
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
            {INSTAGRAM_POSTS.slice(0, 6).map((post, i) => (
              <FooterInstagramTile key={post.id} post={post} index={i} />
            ))}
          </div>

          {/* View on Instagram CTA */}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2 border border-cream/20 font-body-caps text-[9px] tracking-[0.25em] text-cream/60 hover:text-cream hover:border-cream/40 transition-colors duration-200"
          >
            <InstagramIcon />
            View on Instagram
          </a>
        </div>

        {/* ── RIGHT: Contact form ───────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="font-body-caps text-cream/40 text-[9px] tracking-[0.30em]">Get In Touch</span>
            <a
              href={`mailto:${BUSINESS.email}`}
              className="font-body-mixed text-cream/70 text-xs hover:text-grapefruit transition-colors duration-200"
            >
              {BUSINESS.email}
            </a>
            <a
              href={`tel:${BUSINESS.phone.replace(/-/g, "")}`}
              className="font-body-mixed text-cream/70 text-xs hover:text-grapefruit transition-colors duration-200"
            >
              {BUSINESS.phoneDisplay}
            </a>
          </div>

          {state.status === "success" ? (
            <div role="status" className="flex flex-col gap-2 py-4">
              <span className="font-body-caps text-grapefruit text-[9px] tracking-[0.25em]">Thanks</span>
              <p className="font-body-mixed text-cream/55 text-xs">{state.message}</p>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="footer-name" className="font-body-caps text-cream/35 text-[8px] tracking-[0.25em]">
                    Name
                  </label>
                  <input
                    id="footer-name"
                    name="name"
                    maxLength={100}
                    type="text"
                    required
                    autoComplete="name"
                    className="bg-transparent border-b border-cream/20 text-cream font-body-mixed text-xs py-1.5 placeholder:text-cream/25 outline-none focus:border-grapefruit transition-colors duration-200"
                    placeholder="Your name"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="footer-email" className="font-body-caps text-cream/35 text-[8px] tracking-[0.25em]">
                    Email
                  </label>
                  <input
                    id="footer-email"
                    name="email"
                    maxLength={254}
                    type="email"
                    required
                    autoComplete="email"
                    className="bg-transparent border-b border-cream/20 text-cream font-body-mixed text-xs py-1.5 placeholder:text-cream/25 outline-none focus:border-grapefruit transition-colors duration-200"
                    placeholder="you@email.com"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="footer-message" className="font-body-caps text-cream/35 text-[8px] tracking-[0.25em]">
                  Message
                </label>
                <textarea
                  id="footer-message"
                  name="message"
                  maxLength={2000}
                  required
                  rows={3}
                  className="bg-transparent border-b border-cream/20 text-cream font-body-mixed text-xs py-1.5 placeholder:text-cream/25 outline-none focus:border-grapefruit transition-colors duration-200 resize-none"
                  placeholder="Say hello..."
                />
              </div>

              {state.status === "error" && (
                <p role="alert" className="font-body-mixed text-grapefruit text-[10px]">{state.message}</p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-1 self-start font-body-caps text-[9px] tracking-[0.25em] text-midnight bg-cream px-6 py-2.5 hover:bg-grapefruit transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Icon mark ────────────────────────────────────────────────────── */}
      <div
        className="flex justify-center px-section-x py-8"
        style={{ borderTop: "0.5px solid rgba(255,247,240,0.08)" }}
      >
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

function InstagramIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#59605b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" fill="#59605b" stroke="none" />
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
