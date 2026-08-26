"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ENTRANCE_EASE } from "@/lib/motion";

// Mobile menu: a content-height sheet that hangs off the bottom edge of the
// nav bar, painted the same cream as the bar so it reads as the bar extending
// downward. The dark page stays visible below it; a sheet that fills the
// viewport reads as a page transition, a short one reads as a menu.
//
// Always mounted on mobile and driven by `open`, not by AnimatePresence: with
// variants, every toggle retargets from wherever the animation currently is,
// so tapping open/closed quickly never restarts or queues.
//
// Timings are deliberately outside the slow scroll-entrance tier. A menu is a
// control the reader operates repeatedly, and lag in a control reads as the
// site being broken. Ported from the Leo Llamzon site's navMenu numbers.

const NAV_BAR_HEIGHT_PX = 72; // matches Navbar.tsx
const PANEL_Z = 115; // between the header band (110) and the header content (120)

const PANEL_S = 0.42; // clip-path travel of the sheet; the longest tween, sets the feel
const PANEL_Y = -14; // small downward push on the contents so the cream reads as material descending
const ITEM_S = 0.3;
const ITEM_Y = 14;
const ITEM_STAGGER = 0.05;
const ITEMS_AT = 0.08; // items start after the sheet has committed to opening
const CLOSE_SPEED = 1.35; // closing gets out of the way faster than opening settles

// Both clip states share the same inset() shape so the four numbers interpolate.
// Clipping instead of animating height means the panel is always laid out at
// its natural height: nothing is measured, nothing reflows mid-animation.
const CLIP_CLOSED = "inset(0% 0% 100% 0%)";
const CLIP_OPEN = "inset(0% 0% 0% 0%)";

interface NavLink {
  label: string;
  href: string;
}

interface MobileNavPanelProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
  links: NavLink[];
}

function buildVariants(reduced: boolean) {
  const s = (seconds: number) => (reduced ? 0 : seconds);
  const ease = ENTRANCE_EASE;

  const panel: Variants = {
    open: {
      clipPath: CLIP_OPEN,
      visibility: "visible",
      transition: { duration: s(PANEL_S), ease },
    },
    closed: {
      clipPath: CLIP_CLOSED,
      transition: { duration: s(PANEL_S / CLOSE_SPEED), ease },
      // Stand-in for `inert`: out of the tab order and hit testing once closed.
      transitionEnd: { visibility: "hidden" },
    },
  };

  const inner: Variants = {
    open: {
      y: 0,
      transition: {
        duration: s(PANEL_S),
        ease,
        delayChildren: s(ITEMS_AT),
        staggerChildren: s(ITEM_STAGGER),
      },
    },
    closed: {
      y: PANEL_Y,
      transition: {
        duration: s(PANEL_S / CLOSE_SPEED),
        ease,
        staggerChildren: s(ITEM_STAGGER / CLOSE_SPEED),
        staggerDirection: -1, // last in is first out
      },
    },
  };

  const item: Variants = {
    open: { opacity: 1, y: 0, transition: { duration: s(ITEM_S), ease } },
    closed: {
      opacity: 0,
      y: ITEM_Y,
      transition: { duration: s(ITEM_S / CLOSE_SPEED), ease },
    },
  };

  return { panel, inner, item };
}

export function MobileNavPanel({ open, onClose, onNavigate, links }: MobileNavPanelProps) {
  const reduced = useReducedMotion();
  const variants = useMemo(() => buildVariants(!!reduced), [reduced]);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstLinkRef.current?.focus(), PANEL_S * 1000);
    return () => clearTimeout(t);
  }, [open]);

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    onNavigate(href);
  };

  return (
    <>
      {/* Tap-catcher. Transparent, no scrim: the sheet holds its own edge. Sits
          under the panel and under the header content layer so the hamburger
          still receives the close tap. */}
      {open && (
        <div
          aria-hidden
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: PANEL_Z - 1 }}
        />
      )}

      <motion.div
        id="mobile-menu"
        aria-hidden={!open}
        initial="closed"
        animate={open ? "open" : "closed"}
        variants={variants.panel}
        style={{
          position: "fixed",
          top: NAV_BAR_HEIGHT_PX,
          left: 0,
          right: 0,
          zIndex: PANEL_Z,
          background: "var(--color-cream)",
          color: "var(--color-midnight)",
          // Same hairline the nav band draws at full opacity (Navbar.tsx BORDER_RGB / BORDER_MAX_ALPHA).
          borderBottom: "1px solid rgba(41, 45, 42, 0.18)",
          clipPath: CLIP_CLOSED,
          visibility: "hidden",
        }}
      >
        <motion.nav
          aria-label="Primary"
          variants={variants.inner}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            // Text lines up with the hamburger glyph, which sits 0.5rem inside the bar's padding.
            padding: "1.25rem calc(var(--nav-padding-x, 7vw) + 0.5rem) 2rem",
          }}
        >
          {links.map((link, i) => (
            <motion.a
              key={link.href}
              ref={i === 0 ? firstLinkRef : undefined}
              href={link.href}
              className="nav-overlay-link"
              onClick={(e) => handleLinkClick(e, link.href)}
              tabIndex={open ? 0 : -1}
              variants={variants.item}
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "44px",
                width: "fit-content",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.75rem, 6.5vw, 2.25rem)",
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                color: "var(--color-midnight)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {link.label}
            </motion.a>
          ))}
        </motion.nav>
      </motion.div>
    </>
  );
}
